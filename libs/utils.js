const fs = require('fs-extra');
const path = require('path');

class Utils {
    constructor() {
        this.dataPath = path.join(__dirname, '../data');
        this.ensureDataFiles();
    }

    ensureDataFiles() {
        const files = [
            'products.json',
            'settings.json',
            'admins.json',
            'groups.json',
            'orders.json',
            'carts.json'
        ];

        files.forEach(file => {
            const filePath = path.join(this.dataPath, file);
            if (!fs.existsSync(filePath)) {
                const template = require(`./data/templates/${file.replace('.json', '.js')}`);
                fs.writeJsonSync(filePath, template, { spaces: 2 });
            }
        });
    }

    async readData(file) {
        try {
            const filePath = path.join(this.dataPath, file);
            return await fs.readJson(filePath);
        } catch (error) {
            console.error(`Error reading ${file}:`, error);
            return null;
        }
    }

    async writeData(file, data) {
        try {
            const filePath = path.join(this.dataPath, file);
            await fs.writeJson(filePath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error(`Error writing ${file}:`, error);
            return false;
        }
    }

    async updateData(file, updates) {
        try {
            const data = await this.readData(file);
            const updatedData = { ...data, ...updates };
            return await this.writeData(file, updatedData);
        } catch (error) {
            console.error(`Error updating ${file}:`, error);
            return false;
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat('id-ID').format(num);
    }

    formatDate(date = new Date()) {
        return new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'full',
            timeStyle: 'medium'
        }).format(date);
    }

    generateOrderId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `ORD-${timestamp}-${random}`;
    }

    isAdmin(number) {
        const admins = this.readDataSync('admins.json');
        return admins.admins.some(admin => admin.number === number);
    }

    isOwner(number) {
        const config = require('../config');
        return number === config.owner.number;
    }

    readDataSync(file) {
        try {
            const filePath = path.join(this.dataPath, file);
            return fs.readJsonSync(filePath);
        } catch (error) {
            console.error(`Error reading ${file} sync:`, error);
            return {};
        }
    }
}

module.exports = new Utils();
