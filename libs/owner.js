const config = require('../config');
const utils = require('./utils');

class Owner {
    constructor(sock) {
        this.sock = sock;
    }

    async showOwnerInfo(jid) {
        const message = `👑 *OWNER LIVIAA AESTHETIC*\n\n` +
                       `🏪 Store: ${config.store.name}\n` +
                       `👤 Nama: ${config.owner.name}\n` +
                       `📱 WhatsApp: +1 (365) 870-0681\n` +
                       `📸 Instagram: ${config.owner.instagram}\n\n` +
                       `⏰ *Jam Operasional:*\n` +
                       `${config.owner.operatingHours}\n\n` +
                       `📌 *Layanan yang tersedia:*\n` +
                       `• Jual produk digital premium\n` +
                       `• Sewa bot WhatsApp\n` +
                       `• Jasa maintain grup\n` +
                       `• Konsultasi digital\n\n` +
                       `💬 *Cara order:*\n` +
                       `1. Pilih produk di menu bot\n` +
                       `2. Ikuti instruksi pembayaran\n` +
                       `3. Kirim bukti transfer\n` +
                       `4. Produk dikirim dalam 5-15 menit\n\n` +
                       `🔔 *Catatan:*\n` +
                       `• Response cepat di jam operasional\n` +
                       `• Garansi produk sesuai kebijakan\n` +
                       `• Support 24/7 untuk urgent`;
        
        await this.sock.sendMessage(jid, { text: message });
    }

    async handleOwnerCommand(jid, sender, command, args) {
        if (!utils.isOwner(sender)) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Hanya owner yang bisa menggunakan perintah ini!' 
            });
            return;
        }

        switch(command) {
            case 'addproduct':
                await this.addProduct(jid, args);
                break;
                
            case 'editproduct':
                await this.editProduct(jid, args);
                break;
                
            case 'addadmin':
                await this.addAdmin(jid, args);
                break;
                
            case 'broadcast':
                await this.broadcastMessage(jid, args);
                break;
                
            case 'stats':
                await this.showStatistics(jid);
                break;
                
            default:
                await this.sock.sendMessage(jid, { 
                    text: '❌ Perintah tidak dikenali!\n\n' +
                          '📋 Perintah owner yang tersedia:\n' +
                          '• !addproduct [data]\n' +
                          '• !editproduct [id] [data]\n' +
                          '• !addadmin [nomor]\n' +
                          '• !broadcast [pesan]\n' +
                          '• !stats'
                });
        }
    }

    async addProduct(jid, args) {
        // Implementation for adding product
        await this.sock.sendMessage(jid, { 
            text: '✅ Fitur addproduct dalam pengembangan!' 
        });
    }

    async editProduct(jid, args) {
        // Implementation for editing product
        await this.sock.sendMessage(jid, { 
            text: '✅ Fitur editproduct dalam pengembangan!' 
        });
    }

    async addAdmin(jid, args) {
        if (args.length < 1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Format: !addadmin [nomor]\nContoh: !addadmin 6281234567890' 
            });
            return;
        }

        const adminNumber = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const admins = await utils.readData('admins.json');
        
        const existingAdmin = admins.admins.find(a => a.number === adminNumber);
        if (existingAdmin) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Nomor sudah terdaftar sebagai admin!' 
            });
            return;
        }

        admins.admins.push({
            number: adminNumber,
            name: 'Admin',
            level: 'admin',
            permissions: ['vieworders', 'managegroups'],
            addedAt: new Date().toISOString()
        });

        await utils.writeData('admins.json', admins);
        
        await this.sock.sendMessage(jid, { 
            text: `✅ Admin berhasil ditambahkan!\nNomor: ${adminNumber}` 
        });
    }

    async broadcastMessage(jid, args) {
        if (args.length < 1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Format: !broadcast [pesan]' 
            });
            return;
        }

        const message = args.join(' ');
        const broadcastMessage = `📢 *BROADCAST FROM OWNER*\n\n${message}\n\n— ${config.store.name}`;
        
        // Get all users from orders
        const orders = await utils.readData('orders.json');
        const users = [...new Set(orders.orders.map(order => order.userId))];
        
        for (const user of users) {
            try {
                await this.sock.sendMessage(user, { text: broadcastMessage });
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1 second
            } catch (error) {
                console.error(`Failed to send to ${user}:`, error);
            }
        }

        await this.sock.sendMessage(jid, { 
            text: `✅ Broadcast berhasil dikirim ke ${users.length} user!` 
        });
    }

    async showStatistics(jid) {
        const orders = await utils.readData('orders.json');
        const products = await utils.readData('products.json');
        
        const stats = orders.statistics;
        const totalRevenue = utils.formatNumber(stats.totalRevenue);
        
        // Calculate today's orders
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.orders.filter(order => 
            order.createdAt.split('T')[0] === today
        ).length;

        const message = `📊 *STATISTIK STORE*\n\n` +
                       `📅 Tanggal: ${utils.formatDate()}\n\n` +
                       `📦 *PRODUK:*\n` +
                       `Total Produk: ${products.products.length}\n` +
                       `Total Stok: ${products.products.reduce((sum, p) => sum + p.stock, 0)}\n\n` +
                       `🛒 *ORDER:*\n` +
                       `Total Orders: ${stats.totalOrders}\n` +
                       `Hari Ini: ${todayOrders}\n` +
                       `Pending: ${stats.pendingOrders}\n` +
                       `Completed: ${stats.completedOrders}\n\n` +
                       `💰 *PENDAPATAN:*\n` +
                       `Total: Rp${totalRevenue}\n\n` +
                       `⏰ *UPDATE TERAKHIR:*\n` +
                       `${utils.formatDate()}`;
        
        await this.sock.sendMessage(jid, { text: message });
    }
}

module.exports = Owner;
