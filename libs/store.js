const utils = require('./utils');
const config = require('../config');

class Store {
    constructor(sock) {
        this.sock = sock;
    }

    async handleProductSelection(jid, productId, userId) {
        const products = await utils.readData('products.json');
        const product = products.products.find(p => p.id === productId);
        
        if (!product) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Produk tidak ditemukan!' 
            });
            return;
        }
        
        if (product.stock <= 0) {
            await this.sock.sendMessage(jid, { 
                text: `❌ Maaf, stok ${product.name} habis!` 
            });
            return;
        }
        
        // Add to cart
        const carts = await utils.readData('carts.json');
        if (!carts[userId]) {
            carts[userId] = [];
        }
        
        const existingItem = carts[userId].find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            carts[userId].push({
                productId: productId,
                name: product.name,
                price: product.price,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
        }
        
        await utils.writeData('carts.json', carts);
        
        await this.sock.sendMessage(jid, { 
            text: `✅ *${product.name}* telah ditambahkan ke keranjang!\n\n` +
                  `💰 Harga: Rp${product.price}\n` +
                  `📦 Stok tersedia: ${product.stock}\n\n` +
                  `Gunakan perintah !cart untuk melihat keranjang\n` +
                  `atau !checkout untuk melakukan pembelian`
        });
    }

    async showCart(jid, userId) {
        const carts = await utils.readData('carts.json');
        const userCart = carts[userId] || [];
        
        if (userCart.length === 0) {
            await this.sock.sendMessage(jid, { 
                text: '🛒 Keranjang belanja kosong!\n\n' +
                      'Tambahkan produk dengan memilih dari menu utama.'
            });
            return;
        }
        
        let total = 0;
        const cartItems = userCart.map(item => {
            const itemTotal = parseInt(item.price.replace('.', '')) * item.quantity;
            total += itemTotal;
            return `• ${item.name} x${item.quantity} = Rp${utils.formatNumber(itemTotal)}`;
        }).join('\n');
        
        const message = `🛒 *KERANJANG BELANJA*\n\n` +
                       `📋 Isi Keranjang:\n${cartItems}\n\n` +
                       `💰 Total: *Rp${utils.formatNumber(total)}*\n\n` +
                       `📌 Perintah:\n` +
                       `!checkout - Proses pembelian\n` +
                       `!clearcart - Kosongkan keranjang\n` +
                       `!menu - Kembali ke menu utama`;
        
        await this.sock.sendMessage(jid, { text: message });
    }

    async processCheckout(jid, userId) {
        const carts = await utils.readData('carts.json');
        const userCart = carts[userId] || [];
        
        if (userCart.length === 0) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Keranjang belanja kosong!' 
            });
            return;
        }
        
        const products = await utils.readData('products.json');
        
        // Check stock availability
        for (const item of userCart) {
            const product = products.products.find(p => p.id === item.productId);
            if (!product || product.stock < item.quantity) {
                await this.sock.sendMessage(jid, { 
                    text: `❌ Stok ${item.name} tidak mencukupi!` 
                });
                return;
            }
        }
        
        // Calculate total
        let total = 0;
        const orderDetails = userCart.map(item => {
            const price = parseInt(item.price.replace('.', ''));
            const subtotal = price * item.quantity;
            total += subtotal;
            return {
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: price,
                subtotal: subtotal
            };
        });
        
        const orderId = utils.generateOrderId();
        
        // Create order
        const orders = await utils.readData('orders.json');
        orders.orders.push({
            orderId: orderId,
            userId: userId,
            items: orderDetails,
            total: total,
            status: 'pending',
            createdAt: new Date().toISOString(),
            paymentProof: null,
            processedBy: null
        });
        
        // Update statistics
        orders.statistics.pendingOrders += 1;
        orders.statistics.totalOrders += 1;
        
        await utils.writeData('orders.json', orders);
        
        // Clear cart
        delete carts[userId];
        await utils.writeData('carts.json', carts);
        
        // Send order confirmation
        const orderSummary = orderDetails.map(item => 
            `• ${item.name} x${item.quantity} = Rp${utils.formatNumber(item.subtotal)}`
        ).join('\n');
        
        const message = `✅ *ORDER BERHASIL DIBUAT!*\n\n` +
                       `📋 No. Order: ${orderId}\n` +
                       `📅 Tanggal: ${utils.formatDate()}\n\n` +
                       `🛒 Detail Order:\n${orderSummary}\n\n` +
                       `💰 Total: *Rp${utils.formatNumber(total)}*\n\n` +
                       `💳 *CARA PEMBAYARAN:*\n` +
                       `1. Transfer ke salah satu rekening:\n` +
                       `${config.payment.methods.map(p => 
                         `   ${p.name}: ${p.number}`
                       ).join('\n')}\n\n` +
                       `2. Kirim bukti transfer ke owner\n` +
                       `3. Produk akan dikirim setelah konfirmasi\n\n` +
                       `⏰ Estimasi proses: 5-15 menit\n\n` +
                       `👑 Hubungi owner jika ada masalah`;
        
        await this.sock.sendMessage(jid, { text: message });
        
        // Notify owner
        const ownerMessage = `🛒 *ORDER BARU DITERIMA!*\n\n` +
                            `📋 Order ID: ${orderId}\n` +
                            `👤 Customer: ${userId}\n` +
                            `💰 Total: Rp${utils.formatNumber(total)}\n` +
                            `📅 ${utils.formatDate()}`;
        
        await this.sock.sendMessage(config.owner.number, { text: ownerMessage });
    }

    async updateStock(productId, quantity) {
        const products = await utils.readData('products.json');
        const productIndex = products.products.findIndex(p => p.id === productId);
        
        if (productIndex !== -1) {
            products.products[productIndex].stock -= quantity;
            await utils.writeData('products.json', products);
            return true;
        }
        return false;
    }

    async getProductStock(productId) {
        const products = await utils.readData('products.json');
        const product = products.products.find(p => p.id === productId);
        return product ? product.stock : 0;
    }
}

module.exports = Store;
