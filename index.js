const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');
const MessageHandler = require('./handler');
const config = require('./config');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirpSync(dataDir);
}

// Ensure assets directory exists
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirpSync(assetsDir);
}

class LiviaaAestheticBot {
    constructor() {
        this.sock = null;
        this.handler = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            console.log('🚀 Starting Liviaa Aesthetic Bot...');
            console.log(`🏪 Store: ${config.store.name}`);
            console.log(`👑 Owner: ${config.owner.name}`);
            console.log(`📱 Version: ${config.bot.version}\n`);

            const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
            const { version } = await fetchLatestBaileysVersion();
            
            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: true,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
                },
                browser: Browsers.ubuntu('Chrome'),
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: false,
                syncFullHistory: false,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 25000,
            });

            // Initialize message handler
            this.handler = new MessageHandler(this.sock);

            // Handle credentials update
            this.sock.ev.on('creds.update', saveCreds);
            
            // Handle connection updates
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    console.log('📱 Scan QR Code di atas untuk login');
                }
                
                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    
                    console.log(`❌ Connection closed. Reconnecting: ${shouldReconnect}`);
                    
                    if (shouldReconnect) {
                        this.isConnected = false;
                        setTimeout(() => this.connect(), 5000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    console.log('✅ Bot successfully connected!');
                    
                    // Send startup message to owner
                    const startupMessage = `🤖 *${config.bot.name} v${config.bot.version}*\n\n` +
                                          `✅ Bot successfully started!\n` +
                                          `📅 ${new Date().toLocaleString('id-ID')}\n` +
                                          `🏪 Store: ${config.store.name}\n` +
                                          `⚡ Status: Online & Ready\n\n` +
                                          `📊 Ready to serve customers!`;
                    
                    try {
                        await this.sock.sendMessage(config.owner.number, { text: startupMessage });
                    } catch (error) {
                        console.error('Failed to send startup message:', error);
                    }
                    
                    // Set status
                    await this.sock.updateProfileStatus(`${config.store.name} | Online`);
                    await this.sock.updateProfileName(config.bot.name);
                }
            });

            // Handle incoming messages
            this.sock.ev.on('messages.upsert', async ({ messages }) => {
                const msg = messages[0];
                
                // Ignore if bot is not connected
                if (!this.isConnected) return;
                
                // Ignore if message is from bot itself
                if (msg.key.fromMe) return;
                
                // Handle message
                await this.handler.handleMessage(msg);
            });

            // Handle group participants update
            this.sock.ev.on('group-participants.update', async (update) => {
                if (!this.isConnected) return;
                await this.handler.handleGroupParticipantsUpdate(update);
            });

            // Handle message reactions (optional)
            this.sock.ev.on('messages.reaction', async (reactions) => {
                // Handle reactions if needed
            });

        } catch (error) {
            console.error('❌ Connection error:', error);
            setTimeout(() => this.connect(), 10000);
        }
    }

    async sendMessage(jid, content) {
        if (!this.isConnected || !this.sock) {
            console.error('Cannot send message: Bot not connected');
            return;
        }
        
        try {
            await this.sock.sendMessage(jid, content);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    async broadcast(message, users) {
        if (!this.isConnected) return;
        
        console.log(`📢 Broadcasting to ${users.length} users...`);
        
        for (const user of users) {
            try {
                await this.sendMessage(user, { text: message });
                await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid rate limit
            } catch (error) {
                console.error(`Failed to send to ${user}:`, error);
            }
        }
        
        console.log('✅ Broadcast completed!');
    }
}

// Create and start bot instance
const bot = new LiviaaAestheticBot();

// Handle process events
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down bot...');
    
    if (bot.sock) {
        try {
            await bot.sock.sendMessage(config.owner.number, {
                text: `🤖 *${config.bot.name}*\n\n` +
                      `🛑 Bot is shutting down...\n` +
                      `📅 ${new Date().toLocaleString('id-ID')}\n` +
                      `👋 Goodbye!`
            });
            
            await bot.sock.ws.close();
        } catch (error) {
            console.error('Error during shutdown:', error);
        }
    }
    
    console.log('✅ Bot shutdown complete.');
    process.exit(0);
});

// Start the bot
bot.connect().catch(console.error);

// Export for testing or module usage
module.exports = LiviaaAestheticBot;
