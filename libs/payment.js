const config = require('../config');
const utils = require('./utils');

class Payment {
    constructor(sock) {
        this.sock = sock;
    }

    async showPaymentMethods(jid) {
        const paymentMethods = config.payment.methods;
        
        let message = `💳 *METODE PEMBAYARAN ${config.store.name}*\n\n`;
        
        paymentMethods.forEach(method => {
            if (method.name === 'QRIS') {
                message += `📱 *${method.name}:*\n`;
                message += `🔗 Link: ${method.link}\n`;
                message += `📷 QR Code tersedia di bot\n\n`;
            } else {
                message += `📱 *${method.name}:*\n`;
                message += `📞 Nomor: ${method.number}\n`;
                message += `👤 Atas Nama: ${method.holder}\n\n`;
            }
        });
        
        message += `📌 *INSTRUKSI PEMBAYARAN:*\n`;
        message += `1. Transfer sesuai total order\n`;
        message += `2. Simpan bukti transfer\n`;
        message += `3. Kirim bukti ke owner/bot\n`;
        message += `4. Tunggu konfirmasi (5-15 menit)\n\n`;
        message += `⚠️ *PERHATIAN:*\n`;
        message += `• Jangan transfer selain ke rekening diatas\n`;
        message += `• Pastikan nominal sesuai\n`;
        message += `• Screenshoot bukti transfer\n`;
        message += `• Hubungi owner jika ada masalah`;
        
        await this.sock.sendMessage(jid, { text: message });
        
        // If QRIS image exists, send it
        try {
            const fs = require('fs');
            const path = require('path');
            const qrisPath = path.join(__dirname, '../assets/qris.png');
            
            if (fs.existsSync(qrisPath)) {
                await this.sock.sendMessage(jid, {
                    image: { url: qrisPath },
                    caption: '📷 QRIS Payment'
                });
            }
        } catch (error) {
            console.error('Error sending QRIS image:', error);
        }
    }

    async showRefundPolicy(jid) {
        await this.sock.sendMessage(jid, { 
            text: config.payment.refundPolicy 
        });
    }

    async handlePaymentProof(jid, sender, proofUrl) {
        // Implementation for handling payment proof
        const orders = await utils.readData('orders.json');
        const pendingOrders = orders.orders.filter(order => 
            order.userId === sender && order.status === 'pending'
        );
        
        if (pendingOrders.length === 0) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Tidak ada order pending!\n' +
                      'Silahkan order terlebih dahulu.'
            });
            return;
        }
        
        // For now, just notify owner
        const message = `💰 *BUKTI PEMBAYARAN DITERIMA!*\n\n` +
                       `👤 Dari: ${sender}\n` +
                       `🔗 Bukti: ${proofUrl}\n` +
                       `📅 ${utils.formatDate()}\n\n` +
                       `📋 Order ID yang pending:\n` +
                       `${pendingOrders.map(o => `• ${o.orderId}`).join('\n')}\n\n` +
                       `⚠️ Segera cek dan konfirmasi!`;
        
        await this.sock.sendMessage(config.owner.number, { text: message });
        
        await this.sock.sendMessage(jid, { 
            text: '✅ Bukti pembayaran telah diterima!\n' +
                  'Owner akan memproses dalam 5-15 menit.\n' +
                  'Terima kasih atas pembeliannya!'
        });
    }

    async confirmPayment(orderId, jid) {
        const orders = await utils.readData('orders.json');
        const orderIndex = orders.orders.findIndex(o => o.orderId === orderId);
        
        if (orderIndex === -1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Order tidak ditemukan!' 
            });
            return;
        }
        
        const order = orders.orders[orderIndex];
        order.status = 'completed';
        order.processedAt = new Date().toISOString();
        order.processedBy = jid;
        
        // Update stock
        const store = require('./store');
        const storeInstance = new store(this.sock);
        
        for (const item of order.items) {
            await storeInstance.updateStock(item.productId, item.quantity);
        }
        
        // Update statistics
        orders.statistics.completedOrders += 1;
        orders.statistics.pendingOrders -= 1;
        orders.statistics.totalRevenue += order.total;
        
        await utils.writeData('orders.json', orders);
        
        // Notify customer
        await this.sock.sendMessage(order.userId, {
            text: `✅ *PEMBAYARAN DIKONFIRMASI!*\n\n` +
                  `📋 Order ID: ${orderId}\n` +
                  `💰 Total: Rp${utils.formatNumber(order.total)}\n` +
                  `📅 Diproses: ${utils.formatDate()}\n\n` +
                  `📦 Produk sedang dikirim...\n` +
                  `Mohon tunggu beberapa menit.\n\n` +
                  `👑 Terima kasih telah berbelanja di ${config.store.name}!`
        });
        
        await this.sock.sendMessage(jid, { 
            text: `✅ Order ${orderId} telah dikonfirmasi!\n` +
                  `Customer telah dinotifikasi.` 
        });
    }
}

module.exports = Payment;
