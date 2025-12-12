const Menu = require('./libs/menu');
const Store = require('./libs/store');
const Owner = require('./libs/owner');
const Payment = require('./libs/payment');
const Admin = require('./libs/admin');
const Group = require('./libs/group');
const Approval = require('./libs/approval');
const config = require('./config');
const utils = require('./libs/utils');

class MessageHandler {
    constructor(sock) {
        this.sock = sock;
        this.menu = new Menu(sock);
        this.store = new Store(sock);
        this.owner = new Owner(sock);
        this.payment = new Payment(sock);
        this.admin = new Admin(sock);
        this.group = new Group(sock);
        this.approval = new Approval(sock);
        this.userStates = new Map();
    }

    async handleMessage(msg) {
        try {
            const jid = msg.key.remoteJid;
            const text = this.extractText(msg);
            const sender = msg.key.participant || jid;
            const isGroup = jid.endsWith('@g.us');
            const pushname = msg.pushName || 'User';

            // Ignore if message is from bot
            if (msg.key.fromMe) return;

            console.log(`📩 Message from ${sender}: ${text}`);

            // Handle list responses
            if (msg.message?.listResponseMessage) {
                await this.handleListResponse(msg, jid, sender);
                return;
            }

            // Handle buttons responses
            if (msg.message?.buttonsResponseMessage) {
                await this.handleButtonResponse(msg, jid, sender);
                return;
            }

            // Check if it's a command
            const isCommand = config.bot.prefix.some(prefix => text.startsWith(prefix));
            
            if (isCommand) {
                await this.handleCommand(text, jid, sender, isGroup, msg);
                return;
            }

            // Handle numbers for product selection
            if (text.match(/^[0-9]+$/)) {
                const productNum = parseInt(text);
                if (productNum >= 1 && productNum <= 10) {
                    await this.menu.showProductMenu(jid, productNum);
                    return;
                }
            }

            // Handle keywords
            if (text.toLowerCase().includes('menu')) {
                await this.menu.showMainMenu(jid);
                return;
            }

            if (text.toLowerCase().includes('owner')) {
                await this.owner.showOwnerInfo(jid);
                return;
            }

            if (text.toLowerCase().includes('sewa')) {
                await this.showRentalInfo(jid);
                return;
            }

            // Handle user state (for cart, checkout, etc.)
            if (this.userStates.has(sender)) {
                await this.handleUserState(sender, text, jid, msg);
                return;
            }

            // Default response for unknown messages
            if (!isGroup) {
                await this.sock.sendMessage(jid, {
                    text: `👋 Halo ${pushname}!\n\n` +
                          `Selamat datang di ${config.store.name}!\n` +
                          `Ketik *menu* untuk melihat produk yang tersedia.\n\n` +
                          `📌 Atau gunakan perintah:\n` +
                          `• !owner - Hubungi owner\n` +
                          `• !sewa - Info sewa bot\n` +
                          `• !help - Bantuan`
                });
            }

        } catch (error) {
            console.error('Error in handleMessage:', error);
        }
    }

    async handleCommand(text, jid, sender, isGroup, msg) {
        const prefix = config.bot.prefix.find(p => text.startsWith(p));
        const commandText = text.slice(prefix.length).trim();
        const [command, ...args] = commandText.split(' ');

        console.log(`⚡ Command: ${command}, Args: ${args}`);

        switch (command.toLowerCase()) {
            // Store commands
            case 'menu':
                await this.menu.showMainMenu(jid);
                break;
                
            case 'cart':
                await this.store.showCart(jid, sender);
                break;
                
            case 'checkout':
                await this.store.processCheckout(jid, sender);
                break;
                
            case 'clearcart':
                await this.clearCart(sender, jid);
                break;
                
            // Owner commands
            case 'owner':
                await this.owner.showOwnerInfo(jid);
                break;
                
            // Payment commands
            case 'bayar':
            case 'payment':
                await this.payment.showPaymentMethods(jid);
                break;
                
            case 'refund':
                await this.payment.showRefundPolicy(jid);
                break;
                
            // Admin commands
            case 'admin':
                if (isGroup) {
                    await this.menu.showAdminMenu(jid);
                }
                break;
                
            // Group commands
            case 'jaga':
                if (isGroup) {
                    const result = await this.group.guardGroup(jid);
                    await this.sock.sendMessage(jid, { text: result.message });
                }
                break;
                
            case 'infogrup':
                if (isGroup) {
                    await this.group.showGroupInfo(jid);
                }
                break;
                
            case 'setvideo':
                if (isGroup) {
                    await this.admin.handleAdminCommand(jid, sender, 'setwelcome', args);
                }
                break;
                
            // Rental commands
            case 'sewa':
                await this.showRentalInfo(jid);
                break;
                
            // Approval commands
            case 'pending':
                if (await this.admin.isAdmin(sender)) {
                    await this.approval.showPendingOrders(jid, sender);
                }
                break;
                
            case 'approve':
                if (await this.admin.isAdmin(sender)) {
                    if (args[0]) {
                        const result = await this.approval.handleOrderApproval(args[0], 'approve', sender);
                        await this.sock.sendMessage(jid, { text: result.message });
                    }
                }
                break;
                
            case 'reject':
                if (await this.admin.isAdmin(sender)) {
                    if (args[0]) {
                        const result = await this.approval.handleOrderApproval(args[0], 'reject', sender);
                        await this.sock.sendMessage(jid, { text: result.message });
                    }
                }
                break;
                
            // Help command
            case 'help':
                await this.showHelp(jid, sender, isGroup);
                break;
                
            // Stats command (owner only)
            case 'stats':
                if (utils.isOwner(sender)) {
                    await this.owner.showStatistics(jid);
                }
                break;
                
            default:
                await this.sock.sendMessage(jid, {
                    text: `❌ Perintah tidak dikenali!\n\n` +
                          `Ketik *menu* untuk melihat produk\n` +
                          `atau *help* untuk bantuan.`
                });
        }
    }

    async handleListResponse(msg, jid, sender) {
        try {
            const listResponse = msg.message.listResponseMessage;
            const selectedId = listResponse.singleSelectReply.selectedRowId;
            
            console.log(`📋 List response: ${selectedId}`);
            
            if (selectedId.startsWith('product_')) {
                const productId = parseInt(selectedId.split('_')[1]);
                await this.menu.showProductMenu(jid, productId);
                
            } else if (selectedId.startsWith('buy_')) {
                const productId = parseInt(selectedId.split('_')[1]);
                await this.store.handleProductSelection(jid, productId, sender);
                
            } else if (selectedId.startsWith('payment_') || selectedId === 'payment_methods') {
                await this.payment.showPaymentMethods(jid);
                
            } else if (selectedId.startsWith('owner_') || selectedId === 'contact_owner') {
                await this.owner.showOwnerInfo(jid);
                
            } else if (selectedId.startsWith('refund_') || selectedId === 'refund_policy') {
                await this.payment.showRefundPolicy(jid);
                
            } else if (selectedId === 'rent_bot') {
                await this.showRentalInfo(jid);
                
            } else if (selectedId === 'back_main') {
                await this.menu.showMainMenu(jid);
                
            } else if (selectedId.startsWith('stock_')) {
                const productId = parseInt(selectedId.split('_')[1]);
                const stock = await this.store.getProductStock(productId);
                await this.sock.sendMessage(jid, {
                    text: `📦 Stok tersedia: ${stock} unit`
                });
                
            } else if (selectedId.startsWith('admin_')) {
                const action = selectedId.split('_')[1];
                await this.handleAdminAction(jid, sender, action);
            }
            
        } catch (error) {
            console.error('Error handling list response:', error);
        }
    }

    async handleButtonResponse(msg, jid, sender) {
        // Handle button responses if needed
        console.log('Button response:', msg.message.buttonsResponseMessage);
    }

    async handleUserState(userId, text, jid, msg) {
        const state = this.userStates.get(userId);
        
        if (state.type === 'awaiting_payment_proof') {
            await this.payment.handlePaymentProof(jid, userId, text);
            this.userStates.delete(userId);
        }
    }

    async handleGroupParticipantsUpdate(update) {
        await this.group.handleGroupParticipantsUpdate(update);
    }

    async clearCart(userId, jid) {
        const carts = await utils.readData('carts.json');
        delete carts[userId];
        await utils.writeData('carts.json', carts);
        
        await this.sock.sendMessage(jid, {
            text: '✅ Keranjang berhasil dikosongkan!'
        });
    }

    async showRentalInfo(jid) {
        const config = require('./config');
        const message = `🏪 *SEWA BOT ${config.bot.name.toUpperCase()}*\n\n` +
                       `✨ *Fitur yang didapat:*\n` +
                       `${config.rental.features.join('\n')}\n\n` +
                       `💰 *HARGA SEWA:*\n` +
                       `${config.rental.prices.map(p => 
                         `• ${p.period}: Rp${p.price}`
                       ).join('\n')}\n\n` +
                       `📋 *CARA SEWA:*\n` +
                       `1. Pilih paket sewa\n` +
                       `2. Transfer sesuai harga\n` +
                       `3. Kirim bukti transfer\n` +
                       `4. Bot akan diinstall di grup Anda\n\n` +
                       `👑 *HUBUNGI OWNER:*\n` +
                       `WhatsApp: ${config.owner.number}\n` +
                       `Instagram: ${config.owner.instagram}\n\n` +
                       `⏰ *GARANSI:*\n` +
                       `• Support 24/7\n` +
                       `• Update fitur gratis\n` +
                       `• Maintenance rutin`;
        
        await this.sock.sendMessage(jid, { text: message });
    }

    async showHelp(jid, sender, isGroup) {
        let message = `🆘 *BANTUAN ${config.bot.name}*\n\n`;
        
        message += `📌 *PERINTAH UMUM:*\n`;
        message += `• menu - Tampilkan semua produk\n`;
        message += `• cart - Lihat keranjang belanja\n`;
        message += `• checkout - Proses pembelian\n`;
        message += `• owner - Hubungi pemilik store\n`;
        message += `• sewa - Info sewa bot\n`;
        message += `• bayar - Metode pembayaran\n`;
        message += `• refund - Kebijakan refund\n\n`;
        
        if (isGroup) {
            message += `👥 *PERINTAH GRUP:*\n`;
            message += `• jaga - Aktifkan penjagaan grup\n`;
            message += `• infogrup - Info grup saat ini\n`;
            message += `• setvideo [link] - Set video welcome\n\n`;
        }
        
        if (await this.admin.isAdmin(sender)) {
            message += `🛡️ *PERINTAH ADMIN:*\n`;
            message += `• admin - Menu admin panel\n`;
            message += `• pending - Lihat order pending\n`;
            message += `• approve [id] - Setujui order\n`;
            message += `• reject [id] - Tolak order\n\n`;
        }
        
        if (utils.isOwner(sender)) {
            message += `👑 *PERINTAH OWNER:*\n`;
            message += `• stats - Statistik store\n`;
            message += `• broadcast [pesan] - Kirim ke semua user\n`;
            message += `• addadmin [nomor] - Tambah admin\n`;
        }
        
        message += `\n⚡ *CATATAN:*\n`;
        message += `• Gunakan angka untuk pilih produk\n`;
        message += `• Follow Instagram: ${config.owner.instagram}\n`;
        message += `• Jam operasional: ${config.owner.operatingHours}`;
        
        await this.sock.sendMessage(jid, { text: message });
    }

    async handleAdminAction(jid, sender, action) {
        // Handle admin panel actions
        console.log(`Admin action: ${action} by ${sender}`);
        // Implementation based on your needs
    }

    extractText(msg) {
        if (msg.message?.conversation) return msg.message.conversation;
        if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
        if (msg.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
        if (msg.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
        return '';
    }
}

module.exports = MessageHandler;
