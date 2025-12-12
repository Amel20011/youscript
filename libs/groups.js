const utils = require('./utils');
const config = require('../config');

class Group {
    constructor(sock) {
        this.sock = sock;
    }

    async handleGroupParticipantsUpdate(update) {
        const { id, participants, action } = update;
        
        const groups = await utils.readData('groups.json');
        
        switch(action) {
            case 'add':
                await this.handleMemberAdd(id, participants, groups);
                break;
                
            case 'remove':
                await this.handleMemberRemove(id, participants, groups);
                break;
                
            case 'promote':
                await this.handlePromote(id, participants, groups);
                break;
                
            case 'demote':
                await this.handleDemote(id, participants, groups);
                break;
        }
    }

    async handleMemberAdd(groupJid, participants, groups) {
        // Add to groups.json if not exists
        if (!groups.groupSettings[groupJid]) {
            groups.groupSettings[groupJid] = {
                welcomeEnabled: true,
                goodbyeEnabled: true,
                antiSpam: true,
                antiLink: true,
                maxWarnings: 3
            };
            await utils.writeData('groups.json', groups);
        }
        
        // Send welcome message
        const settings = groups.groupSettings[groupJid];
        if (settings.welcomeEnabled) {
            for (const participant of participants) {
                let welcomeMessage = config.groupGuard.welcomeMessage;
                
                // Add welcome video if exists
                if (groups.welcomeVideos && groups.welcomeVideos[groupJid]) {
                    const videoLink = groups.welcomeVideos[groupJid];
                    welcomeMessage += `\n\n🎥 Welcome video: ${videoLink}`;
                    
                    try {
                        await this.sock.sendMessage(participant, {
                            text: `🎬 Video welcome dari grup:\n${videoLink}`
                        });
                    } catch (error) {
                        console.error('Error sending video link:', error);
                    }
                }
                
                await this.sock.sendMessage(groupJid, {
                    text: `👋 Welcome @${participant.split('@')[0]}!\n\n${welcomeMessage}`,
                    mentions: [participant]
                });
                
                // Send rules to new member
                await this.sock.sendMessage(participant, {
                    text: `📜 *RULES GRUP:*\n\n${config.groupGuard.rules.join('\n')}`
                });
            }
        }
    }

    async handleMemberRemove(groupJid, participants, groups) {
        const settings = groups.groupSettings[groupJid];
        if (settings && settings.goodbyeEnabled) {
            for (const participant of participants) {
                await this.sock.sendMessage(groupJid, {
                    text: `👋 Goodbye @${participant.split('@')[0]}!\n${config.groupGuard.goodbyeMessage}`,
                    mentions: [participant]
                });
            }
        }
    }

    async handlePromote(groupJid, participants, groups) {
        for (const participant of participants) {
            await this.sock.sendMessage(groupJid, {
                text: `🎉 Selamat! @${participant.split('@')[0]} telah di-promote menjadi admin grup!`,
                mentions: [participant]
            });
        }
    }

    async handleDemote(groupJid, participants, groups) {
        for (const participant of participants) {
            await this.sock.sendMessage(groupJid, {
                text: `⚠️ @${participant.split('@')[0]} telah di-demote dari admin.`,
                mentions: [participant]
            });
        }
    }

    async guardGroup(groupJid) {
        // Implementation for group guarding features
        // This can include anti-spam, anti-link, etc.
        
        const groups = await utils.readData('groups.json');
        if (!groups.groupSettings[groupJid]) {
            groups.groupSettings[groupJid] = {
                welcomeEnabled: true,
                goodbyeEnabled: true,
                antiSpam: true,
                antiLink: true,
                maxWarnings: 3
            };
            await utils.writeData('groups.json', groups);
        }
        
        return {
            message: '🛡️ Bot sedang menjaga grup ini!',
            features: groups.groupSettings[groupJid]
        };
    }

    async showGroupInfo(jid) {
        try {
            const metadata = await this.sock.groupMetadata(jid);
            const groups = await utils.readData('groups.json');
            const settings = groups.groupSettings[jid] || {};
            
            const info = `📊 *INFO GRUP*\n\n` +
                        `🏷️ Nama: ${metadata.subject}\n` +
                        `👥 Member: ${metadata.participants.length}\n` +
                        `👑 Admin: ${metadata.participants.filter(p => p.admin).length}\n` +
                        `📅 Dibuat: ${new Date(metadata.creation * 1000).toLocaleDateString('id-ID')}\n\n` +
                        `⚙️ *PENGATURAN BOT:*\n` +
                        `• Welcome: ${settings.welcomeEnabled ? '✅' : '❌'}\n` +
                        `• Goodbye: ${settings.goodbyeEnabled ? '✅' : '❌'}\n` +
                        `• Anti Spam: ${settings.antiSpam ? '✅' : '❌'}\n` +
                        `• Anti Link: ${settings.antiLink ? '✅' : '❌'}\n\n` +
                        `🎥 Welcome Video: ${groups.welcomeVideos && groups.welcomeVideos[jid] ? '✅' : '❌'}`;
            
            await this.sock.sendMessage(jid, { text: info });
        } catch (error) {
            console.error('Error getting group info:', error);
        }
    }

    async toggleGroupSetting(jid, setting, sender) {
        // Check if sender is admin
        const admin = require('./admin');
        const adminInstance = new admin(this.sock);
        
        if (!await adminInstance.isAdmin(sender)) {
            await this.sock.sendMessage(jid, { 
                text: '❌ Hanya admin yang bisa mengatur grup!' 
            });
            return;
        }
        
        const groups = await utils.readData('groups.json');
        if (!groups.groupSettings[jid]) {
            groups.groupSettings[jid] = {
                welcomeEnabled: true,
                goodbyeEnabled: true,
                antiSpam: true,
                antiLink: true,
                maxWarnings: 3
            };
        }
        
        const settings = groups.groupSettings[jid];
        const validSettings = ['welcomeEnabled', 'goodbyeEnabled', 'antiSpam', 'antiLink'];
        
        if (!validSettings.includes(setting)) {
            await this.sock.sendMessage(jid, { 
                text: `❌ Setting tidak valid!\n\n` +
                      `Settings yang tersedia:\n` +
                      `• welcomeEnabled\n` +
                      `• goodbyeEnabled\n` +
                      `• antiSpam\n` +
                      `• antiLink` 
            });
            return;
        }
        
        settings[setting] = !settings[setting];
        await utils.writeData('groups.json', groups);
        
        await this.sock.sendMessage(jid, { 
            text: `✅ Setting ${setting} diubah menjadi: ${settings[setting] ? 'AKTIF' : 'NONAKTIF'}` 
        });
    }
}

module.exports = Group;
