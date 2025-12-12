const utils = require('./utils');
const config = require('../config');

class Admin {
    constructor(sock) {
        this.sock = sock;
    }

    async isAdmin(userId) {
        const admins = await utils.readData('admins.json');
        return admins.admins.some(admin => admin.number === userId);
    }

    async getAdminLevel(userId) {
        const admins = await utils.readData('admins.json');
        const admin = admins.admins.find(a => a.number === userId);
        return admin ? admin.level : null;
    }

    async handleAdminCommand(jid, sender, command, args) {
        if (!await this.isAdmin(sender)) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Hanya admin yang bisa menggunakan perintah ini!' 
            });
            return;
        }

        const adminLevel = await this.getAdminLevel(sender);
        const permissions = config.permissions[adminLevel] || [];

        switch(command) {
            case 'kick':
                if (permissions.includes('kick')) {
                    await this.kickMember(jid, args);
                }
                break;
                
            case 'warn':
                if (permissions.includes('warn')) {
                    await this.warnMember(jid, sender, args);
                }
                break;
                
            case 'promote':
                if (permissions.includes('promote')) {
                    await this.promoteMember(jid, args);
                }
                break;
                
            case 'demote':
                if (permissions.includes('demote')) {
                    await this.demoteMember(jid, args);
                }
                break;
                
            case 'delete':
                if (permissions.includes('delete')) {
                    await this.deleteMessage(jid, args);
                }
                break;
                
            case 'setwelcome':
                if (permissions.includes('setwelcome')) {
                    await this.setWelcomeVideo(jid, args);
                }
                break;
                
            default:
                await this.showAdminHelp(jid, adminLevel);
        }
    }

    async kickMember(jid, args) {
        if (args.length < 1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Format: !kick [@tag/nomor] [alasan]' 
            });
            return;
        }

        try {
            let target = args[0];
            if (target.startsWith('@')) {
                target = target.replace('@', '') + '@s.whatsapp.net';
            } else {
                target = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }
            
            const reason = args.slice(1).join(' ') || 'Melanggar rules grup';
            
            await this.sock.groupParticipantsUpdate(jid, [target], 'remove');
            
            await this.sock.sendMessage(jid, { 
                text: `✅ Member telah di-kick!\n\n` +
                      `👤 Target: ${target}\n` +
                      `📝 Alasan: ${reason}` 
            });
        } catch (error) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Gagal meng-kick member!' 
            });
        }
    }

    async warnMember(jid, adminId, args) {
        if (args.length < 1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Format: !warn [@tag/nomor] [alasan]' 
            });
            return;
        }

        let target = args[0];
        if (target.startsWith('@')) {
            target = target.replace('@', '') + '@s.whatsapp.net';
        } else {
            target = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }
        
        const reason = args.slice(1).join(' ') || 'Peringatan dari admin';
        const admin = await this.getAdminInfo(adminId);
        
        const warning = `⚠️ *PERINGATAN DARI ADMIN*\n\n` +
                       `👤 Member: ${target}\n` +
                       `🛡️ Admin: ${admin.name}\n` +
                       `📝 Alasan: ${reason}\n\n` +
                       `📌 Rules grup:\n` +
                       `${config.groupGuard.rules.join('\n')}\n\n` +
                       `🚨 Warning: 3x warning = kick otomatis`;
        
        await this.sock.sendMessage(jid, { text: warning });
        await this.sock.sendMessage(target, { text: warning });
    }

    async promoteMember(jid, args) {
        if (args.length < 1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Format: !promote [@tag/nomor]' 
            });
            return;
        }

        try {
            let target = args[0];
            if (target.startsWith('@')) {
                target = target.replace('@', '') + '@s.whatsapp.net';
            } else {
                target = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }
            
            await this.sock.groupParticipantsUpdate(jid, [target], 'promote');
            
            await this.sock.sendMessage(jid, { 
                text: `✅ Member telah di-promote menjadi admin!` 
            });
        } catch (error) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Gagal promote member!' 
            });
        }
    }

    async demoteMember(jid, args) {
        if (args.length < 1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Format: !demote [@tag/nomor]' 
            });
            return;
        }

        try {
            let target = args[0];
            if (target.startsWith('@')) {
                target = target.replace('@', '') + '@s.whatsapp.net';
            } else {
                target = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }
            
            await this.sock.groupParticipantsUpdate(jid, [target], 'demote');
            
            await this.sock.sendMessage(jid, { 
                text: `✅ Admin telah di-demote menjadi member!` 
            });
        } catch (error) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Gagal demote admin!' 
            });
        }
    }

    async setWelcomeVideo(jid, args) {
        if (args.length < 1) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Format: !setwelcome [link video]' 
            });
            return;
        }

        const videoLink = args[0];
        const groups = await utils.readData('groups.json');
        
        if (!groups.welcomeVideos) {
            groups.welcomeVideos = {};
        }
        
        groups.welcomeVideos[jid] = videoLink;
        await utils.writeData('groups.json', groups);
        
        await this.sock.sendMessage(jid, { 
            text: `✅ Welcome video berhasil diatur!\n` +
                  `🔗 Link: ${videoLink}` 
        });
    }

    async getAdminInfo(adminId) {
        const admins = await utils.readData('admins.json');
        return admins.admins.find(a => a.number === adminId) || { name: 'Admin' };
    }

    async showAdminHelp(jid, adminLevel) {
        const permissions = config.permissions[adminLevel] || [];
        
        let commands = '';
        if (permissions.includes('kick')) commands += '• !kick [@tag] - Kick member\n';
        if (permissions.includes('warn')) commands += '• !warn [@tag] - Warn member\n';
        if (permissions.includes('promote')) commands += '• !promote [@tag] - Promote member\n';
        if (permissions.includes('demote')) commands += '• !demote [@tag] - Demote admin\n';
        if (permissions.includes('delete')) commands += '• !delete - Hapus pesan\n';
        if (permissions.includes('setwelcome')) commands += '• !setwelcome [link] - Set welcome video\n';
        
        const message = `🛡️ *PERINTAH ADMIN (${adminLevel})*\n\n` +
                       `📋 Level: ${adminLevel}\n` +
                       `🔧 Permissions: ${permissions.join(', ')}\n\n` +
                       `📌 Perintah yang tersedia:\n${commands}\n` +
                       `⚡ Gunakan @tag untuk menargetkan member`;
        
        await this.sock.sendMessage(jid, { text: message });
    }
}

module.exports = Admin;
