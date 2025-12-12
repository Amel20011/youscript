const utils = require('./utils');

class Approval {
    constructor(sock) {
        this.sock = sock;
        this.pendingApprovals = new Map();
    }

    async handleOrderApproval(orderId, action, adminId) {
        const orders = await utils.readData('orders.json');
        const orderIndex = orders.orders.findIndex(o => o.orderId === orderId);
        
        if (orderIndex === -1) {
            return { success: false, message: 'Order tidak ditemukan!' };
        }
        
        const order = orders.orders[orderIndex];
        
        if (action === 'approve') {
            order.status = 'approved';
            order.approvedBy = adminId;
            order.approvedAt = new Date().toISOString();
            
            // Update statistics
            orders.statistics.approvedOrders = (orders.statistics.approvedOrders || 0) + 1;
            orders.statistics.pendingOrders -= 1;
            
            await utils.writeData('orders.json', orders);
            
            // Notify customer
            await this.sock.sendMessage(order.userId, {
                text: `✅ *ORDER DISETUJUI!*\n\n` +
                      `📋 Order ID: ${orderId}\n` +
                      `💰 Total: Rp${utils.formatNumber(order.total)}\n` +
                      `👑 Disetujui oleh: Admin\n` +
                      `📅 Waktu: ${utils.formatDate()}\n\n` +
                      `📦 Produk sedang diproses...\n` +
                      `Terima kasih telah berbelanja!`
            });
            
            return { 
                success: true, 
                message: `Order ${orderId} telah disetujui!` 
            };
            
        } else if (action === 'reject') {
            order.status = 'rejected';
            order.rejectedBy = adminId;
            order.rejectedAt = new Date().toISOString();
            order.rejectionReason = 'Ditolak oleh admin';
            
            // Update statistics
            orders.statistics.rejectedOrders = (orders.statistics.rejectedOrders || 0) + 1;
            orders.statistics.pendingOrders -= 1;
            
            await utils.writeData('orders.json', orders);
            
            // Notify customer
            await this.sock.sendMessage(order.userId, {
                text: `❌ *ORDER DITOLAK!*\n\n` +
                      `📋 Order ID: ${orderId}\n` +
                      `📝 Alasan: Ditolak oleh admin\n` +
                      `📅 Waktu: ${utils.formatDate()}\n\n` +
                      `📞 Hubungi owner untuk informasi lebih lanjut.`
            });
            
            return { 
                success: true, 
                message: `Order ${orderId} telah ditolak!` 
            };
        }
        
        return { success: false, message: 'Aksi tidak valid!' };
    }

    async showPendingOrders(jid, adminId) {
        const orders = await utils.readData('orders.json');
        const pendingOrders = orders.orders.filter(o => o.status === 'pending');
        
        if (pendingOrders.length === 0) {
            await this.sock.sendMessage(jid, { 
                text: '📭 Tidak ada order pending!' 
            });
            return;
        }
        
        let message = `📋 *ORDER PENDING MENUNGGU APPROVAL*\n\n`;
        
        pendingOrders.forEach((order, index) => {
            const items = order.items.map(item => 
                `  • ${item.name} x${item.quantity}`
            ).join('\n');
            
            message += `📌 *Order #${index + 1}*\n`;
            message += `📋 ID: ${order.orderId}\n`;
            message += `👤 Customer: ${order.userId}\n`;
            message += `🛒 Items:\n${items}\n`;
            message += `💰 Total: Rp${utils.formatNumber(order.total)}\n`;
            message += `📅 Date: ${new Date(order.createdAt).toLocaleString('id-ID')}\n`;
            message += `🔧 Aksi: !approve ${order.orderId} / !reject ${order.orderId}\n\n`;
        });
        
        message += `📌 *PERINTAH:*\n`;
        message += `• !approve [orderId] - Setujui order\n`;
        message += `• !reject [orderId] - Tolak order\n`;
        message += `• !vieworder [orderId] - Lihat detail order`;
        
        await this.sock.sendMessage(jid, { text: message });
    }

    async addPendingApproval(type, data, approver) {
        const approvalId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.pendingApprovals.set(approvalId, {
            type: type,
            data: data,
            approver: approver,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        // Auto remove after 24 hours
        setTimeout(() => {
            if (this.pendingApprovals.has(approvalId)) {
                this.pendingApprovals.delete(approvalId);
            }
        }, 24 * 60 * 60 * 1000);
        
        return approvalId;
    }

    async getPendingApproval(approvalId) {
        return this.pendingApprovals.get(approvalId);
    }

    async processApproval(approvalId, action, processor) {
        const approval = this.pendingApprovals.get(approvalId);
        
        if (!approval) {
            return { success: false, message: 'Approval tidak ditemukan!' };
        }
        
        approval.status = action;
        approval.processedBy = processor;
        approval.processedAt = Date.now();
        
        this.pendingApprovals.set(approvalId, approval);
        
        // Notify approver
        if (approval.approver) {
            const status = action === 'approved' ? 'DISETUJUI' : 'DITOLAK';
            await this.sock.sendMessage(approval.approver, {
                text: `📋 *APPROVAL ${status}*\n\n` +
                      `🔑 ID: ${approvalId}\n` +
                      `📝 Type: ${approval.type}\n` +
                      `👤 Diproses oleh: ${processor}\n` +
                      `📅 Waktu: ${utils.formatDate()}\n\n` +
                      `Status: ${status}`
            });
        }
        
        return { 
            success: true, 
            message: `Approval ${approvalId} telah diproses!` 
        };
    }
}

module.exports = Approval;
