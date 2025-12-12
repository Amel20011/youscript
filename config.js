module.exports = {
    // Owner Configuration
    owner: {
        number: '13658700681@s.whatsapp.net',
        name: 'Liviaa',
        instagram: '@liviaa.aesthetic',
        operatingHours: '08:00 - 22:00 WIB'
    },
    
    // Bot Configuration
    bot: {
        name: 'Liviaa Aesthetic Store',
        prefix: ['!', '/', '.'],
        version: '1.0.0'
    },
    
    // Store Configuration
    store: {
        name: 'LIVIAA AESTHETIC STORE',
        slogan: 'Toko Digital Premium Terpercaya',
        minOrder: 1,
        maxOrder: 10
    },
    
    // Payment Configuration
    payment: {
        methods: [
            { name: 'DANA', number: '081234567890', holder: 'LIVIAA STORE' },
            { name: 'OVO', number: '081234567890', holder: 'LIVIAA STORE' },
            { name: 'GOPAY', number: '081234567890', holder: 'LIVIAA STORE' },
            { name: 'QRIS', image: 'qris.png', link: 'https://qris.id/liviaa' },
            { name: 'BCA', number: '1234567890', holder: 'LIVIAA STORE' },
            { name: 'BRI', number: '1234567890', holder: 'LIVIAA STORE' }
        ],
        refundPolicy: `
📋 *KEBIJAKAN REFUND LIVIAA AESTHETIC*
1. Refund hanya berlaku jika produk tidak bisa digunakan
2. Pengajuan maksimal 2 jam setelah pembelian
3. Proses refund 1x24 jam hari kerja
4. Tidak ada refund karena kesalahan user
5. Screenshot bukti transfer wajib
        `
    },
    
    // Rental Bot Configuration
    rental: {
        prices: [
            { period: '1 Minggu', price: '30.000' },
            { period: '1 Bulan', price: '100.000' },
            { period: '3 Bulan', price: '250.000' },
            { period: '6 Bulan', price: '450.000' },
            { period: '1 Tahun', price: '800.000' }
        ],
        features: [
            '✅ Welcome video MP4',
            '✅ Auto response produk',
            '✅ Jaga grup dari spam',
            '✅ Admin tools lengkap',
            '✅ Store menu otomatis',
            '✅ Anti toxic member',
            '✅ Auto backup data',
            '✅ 24/7 Support'
        ]
    },
    
    // Group Guard Configuration
    groupGuard: {
        welcomeMessage: `🎉 Selamat datang di grup!\n\nJaga kerukunan dan patuhi rules grup.`,
        goodbyeMessage: `👋 Selamat tinggal!`,
        rules: [
            '1. No spam',
            '2. No SARA',
            '3. No promo tanpa izin',
            '4. Hormati semua member'
        ]
    }
}
