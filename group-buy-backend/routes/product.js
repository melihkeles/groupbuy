// group-buy-backend/routes/product.js
const express = require('express');
const router = express.Router();
const { authMiddleware, adminAuthMiddleware } = require('../middlewares/authMiddleware'); // authMiddleware ve adminAuthMiddleware import et

// Yeni bir ürün oluşturma (Sadece Adminler için)
router.post('/', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { name, description, sku, imageUrl, priceRetail, stockQuantity, category } = req.body;

    // Temel doğrulama
    if (!name || !priceRetail || !stockQuantity) {
        return res.status(400).json({ message: 'Ürün adı, perakende fiyatı ve stok adedi zorunludur.' });
    }
    if (isNaN(priceRetail) || isNaN(stockQuantity) || priceRetail <= 0 || stockQuantity < 0) {
        return res.status(400).json({ message: 'Geçersiz fiyat veya stok adedi.' });
    }

    try {
        const product = await req.prisma.product.create({
            data: {
                name,
                description,
                sku,
                imageUrl,
                priceRetail: parseFloat(priceRetail), // Float olarak kaydet
                stockQuantity: parseInt(stockQuantity), // Int olarak kaydet
                category,
                isActive: true // Yeni ürün varsayılan olarak aktif başlar
            },
        });
        res.status(201).json(product);
    } catch (error) {
        console.error('Ürün oluşturma hatası:', error);
        // SKU benzersizliği hatası için özel mesaj
        if (error.code === 'P2002' && error.meta.target.includes('sku')) {
            return res.status(409).json({ message: 'Bu SKU zaten mevcut.' });
        }
        res.status(500).json({ message: 'Ürün oluşturulurken bir hata oluştu.', error: error.message });
    }
});

// Tüm ürünleri listeleme (Aktif olanlar veya tümü, Adminler için tümü)
router.get('/', async (req, res) => {
    const { isActive } = req.query; // Query parametresi ile aktif ürünleri filtrele
    const filter = {};
    if (isActive !== undefined) {
        filter.isActive = isActive === 'true'; // string 'true'/'false' -> boolean true/false
    }

    try {
        const products = await req.prisma.product.findMany({
            where: filter
        });
        res.status(200).json(products);
    } catch (error) {
        console.error('Ürünleri listeleme hatası:', error);
        res.status(500).json({ message: 'Ürünler listelenirken bir hata oluştu.', error: error.message });
    }
});

// Belirli bir ürünü ID ile getirme
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const product = await req.prisma.product.findUnique({
            where: { id: id },
        });
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı.' });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error('Ürün getirme hatası:', error);
        res.status(500).json({ message: 'Ürün getirilirken bir hata oluştu.', error: error.message });
    }
});

// Bir ürünü güncelleme (Sadece Adminler için)
router.put('/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const { name, description, sku, imageUrl, priceRetail, stockQuantity, category, isActive } = req.body;

    // Temel doğrulama
    if (priceRetail !== undefined && (isNaN(priceRetail) || priceRetail <= 0)) {
        return res.status(400).json({ message: 'Geçersiz perakende fiyatı.' });
    }
    if (stockQuantity !== undefined && (isNaN(stockQuantity) || stockQuantity < 0)) {
        return res.status(400).json({ message: 'Geçersiz stok adedi.' });
    }

    try {
        const updatedProduct = await req.prisma.product.update({
            where: { id: id },
            data: {
                name,
                description,
                sku,
                imageUrl,
                priceRetail: priceRetail !== undefined ? parseFloat(priceRetail) : undefined,
                stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
                category,
                isActive,
                updatedAt: new Date()
            },
        });
        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error('Ürün güncelleme hatası:', error);
        if (error.code === 'P2025') { // Kayıt bulunamadı hatası
            return res.status(404).json({ message: 'Güncellenecek ürün bulunamadı.' });
        }
        if (error.code === 'P2002' && error.meta.target.includes('sku')) {
            return res.status(409).json({ message: 'Bu SKU zaten başka bir ürüne ait.' });
        }
        res.status(500).json({ message: 'Ürün güncellenirken bir hata oluştu.', error: error.message });
    }
});

// Bir ürünü silme (Sadece Adminler için)
// Genellikle ürünler doğrudan silinmez, pasif hale getirilir (isActive: false)
// Ancak gerçek silme işlemi gerekiyorsa kullanılabilir.
router.delete('/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // Ürünle ilişkili aktif kampanya veya sipariş olup olmadığını kontrol etmek iyi bir pratik olabilir.
        // Eğer varsa silme işlemi engellenebilir veya ilgili ilişkiler de silinmelidir (cascade delete)
        // Prisma'da cascade delete şemada tanımlanır.
        const deletedProduct = await req.prisma.product.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Ürün başarıyla silindi.', product: deletedProduct });
    } catch (error) {
        console.error('Ürün silme hatası:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Silinecek ürün bulunamadı.' });
        }
        // Eğer ürün başka bir tabloyla ilişkiliyse (örn: Campaign), Prisma hata verecektir.
        // Bu durumda ya cascade delete ayarlamalısınız ya da önce ilişkili kayıtları silmelisiniz.
        if (error.code === 'P2003') { // Foreign key constraint failed
            return res.status(409).json({ message: 'Bu ürünle ilişkili kampanyalar veya siparişler olduğu için silinemiyor.' });
        }
        res.status(500).json({ message: 'Ürün silinirken bir hata oluştu.', error: error.message });
    }
});

// Tüm ürünleri listeleme (Aktif olanlar veya tümü, Adminler için tümü)
router.get('/', async (req, res) => {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
    }

    try {
        const products = await req.prisma.product.findMany({ // prisma yerine req.prisma kullan
            where: filter
        });
        res.status(200).json(products);
    } catch (error) {
        console.error('Ürünleri listeleme hatası:', error);
        res.status(500).json({ message: 'Ürünler listelenirken bir hata oluştu.', error: error.message });
    }
});


module.exports = router;