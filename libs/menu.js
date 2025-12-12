const config = require('../config');
const utils = require('./utils');

class Menu {
    constructor(sock) {
        this.sock = sock;
    }

    async showMainMenu(jid) {
        const products = await utils.readData('products.json');
        
        const listMessage = {
            text: `🛍️ *${config.store.name}*\n\n` +
                  `${config.store.slogan}\n\n` +
                  `📋 *LIST PRODUK TERSEDIA:*\n\n` +
                  `${products.products.map(p => 
                    `${p.id}. ${p.name} - Rp${p.price} (Stok: ${p.stock})`
                  ).join('\n')}\n\n` +
                  `📍 *CARA ORDER:*\n` +
                  `1. Pilih nomor produk (1-10)\n` +
                  `2. Ikuti instruksi selanjutnya\n` +
                  `3. Transfer sesuai harga\n` +
                  `4. Kirim bukti transfer\n\n` +
                  `⏰ *Jam Operasional:*\n` +
                  `${config.owner.operatingHours}`,
            footer: config.bot.name,
            title: 'MENU UTAMA',
            buttonText: 'PILIH PRODUK',
            sections: [
                {
                    title: "📦 KATEGORI PRODUK",
                    rows: products.products.map(product => ({
                        title: `🎯 ${product.name}`,
                        description: `Rp${product.price} | Stok: ${product.stock}`,
                        rowId: `product_${product.id}`
                    }))
                },
                {
                    title: "🔧 MENU LAINNYA",
                    rows: [
                        {
                            title: "👑 Hubungi Owner",
                            description: "Konsultasi & order manual",
                            rowId: "contact_owner"
                        },
                        {
                            title: "💳 Cara Bayar",
                            description: "Metode pembayaran tersedia",
                            rowId: "payment_methods"
                        },
                        {
                            title: "📋 Kebijakan Refund",
                            description: "Syarat dan ketentuan refund",
                            rowId: "refund_policy"
                        },
                        {
                            title: "🏪 Sewa Bot",
                            description: "Sewa bot untuk grup Anda",
                            rowId: "rent_bot"
                        }
                    ]
                }
            ]
        };
        
        await this.sock.sendMessage(jid, listMessage);
    }

    async showProductMenu(jid, productId) {
        const products = await utils.readData('products.json');
        const product = products.products.find(p => p.id === productId);
        
        if (!product) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Produk tidak ditemukan!' 
            });
            return;
        }
        
        const listMessage = {
            text: `🛒 *${product.name}*\n\n` +
                  `💰 Harga: *Rp${product.price}*\n` +
                  `📦 Stok: ${product.stock}\n\n` +
                  `📝 Deskripsi:\n${product.description}\n\n` +
                  `✨ Fitur:\n${product.features.map(f => `• ${f}`).join('\n')}\n\n` +
                  `Pilih opsi dibawah:`,
            footer: config.store.name,
            title: `PRODUK #${product.id}`,
            buttonText: 'PILIH AKSI',
            sections: [
                {
                    title: "🛒 AKSI PEMBELIAN",
                    rows: [
                        {
                            title: "💳 Beli Sekarang",
                            description: "Order produk ini sekarang",
                            rowId: `buy_${product.id}`
                        },
                        {
                            title: "💬 Tanya Stok",
                            description: "Cek ketersediaan produk",
                            rowId: `stock_${product.id}`
                        },
                        {
                            title: "💰 Cara Bayar",
                            description: "Metode pembayaran untuk produk ini",
                            rowId: `payment_${product.id}`
                        }
                    ]
                },
                {
                    title: "📋 INFORMASI",
                    rows: [
                        {
                            title: "👑 Hubungi Owner",
                            description: "Chat langsung untuk order",
                            rowId: `owner_${product.id}`
                        },
                        {
                            title: "↩️ Kebijakan Refund",
                            description: "Syarat refund produk ini",
                            rowId: `refund_${product.id}`
                        },
                        {
                            title: "📦 Produk Lain",
                            description: "Kembali ke menu utama",
                            rowId: "back_main"
                        }
                    ]
                }
            ]
        };
        
        await this.sock.sendMessage(jid, listMessage);
    }

    async showAdminMenu(jid) {
        const listMessage = {
            text: `⚙️ *MENU ADMIN LIVIAA AESTHETIC*\n\n` +
                  `Pilih perintah admin yang ingin digunakan:`,
            footer: config.bot.name,
            title: 'PANEL ADMIN',
            buttonText: 'PILIH PERINTAH',
            sections: [
                {
                    title: "📊 MANAJEMEN DATA",
                    rows: [
                        {
                            title: "📦 Tambah Produk",
                            description: "Tambah produk baru ke store",
                            rowId: "admin_addproduct"
                        },
                        {
                            title: "✏️ Edit Produk",
                            description: "Edit produk yang ada",
                            rowId: "admin_editproduct"
                        },
                        {
                            title: "📋 Lihat Order",
                            description: "Lihat semua pesanan",
                            rowId: "admin_vieworders"
                        }
                    ]
                },
                {
                    title: "👥 MANAJEMEN USER",
                    rows: [
                        {
                            title: "➕ Tambah Admin",
                            description: "Tambahkan admin baru",
                            rowId: "admin_addadmin"
                        },
                        {
                            title: "📊 List Admin",
                            description: "Lihat semua admin",
                            rowId: "admin_listadmins"
                        },
                        {
                            title: "📢 Broadcast",
                            description: "Kirim pesan ke semua user",
                            rowId: "admin_broadcast"
                        }
                    ]
                },
                {
                    title: "🛡️ MANAJEMEN GRUP",
                    rows: [
                        {
                            title: "📊 List Grup",
                            description: "Lihat semua grup",
                            rowId: "admin_listgroups"
                        },
                        {
                            title: "🎥 Set Welcome Video",
                            description: "Atur video welcome",
                            rowId: "admin_setwelcome"
                        },
                        {
                            title: "⚙️ Pengaturan Grup",
                            description: "Atur pengaturan grup",
                            rowId: "admin_groupsettings"
                        }
                    ]
                }
            ]
        };
        
        await this.sock.sendMessage(jid, listMessage);
    }
}

module.exports = Menu;
