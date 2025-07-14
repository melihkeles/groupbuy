// group-buy-backend/routes/campaign.js
const express = require('express');
const router = express.Router();

const { authMiddleware, adminAuthMiddleware } = require('../middlewares/authMiddleware');
const { CampaignStatus, OrderStatus } = require('@prisma/client'); // Enumları import et

// YENİ BİR KAMPANYA OLUŞTURMA (Sadece Adminler için)
router.post('/', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { productId, targetQuantity, endDate, campaignPrice, minOrderQuantity, maxOrderQuantity } = req.body;

    // Temel doğrulama
    if (!productId || !targetQuantity || !endDate || !campaignPrice) {
        return res.status(400).json({ message: 'Tüm zorunlu kampanya alanlarını doldurun.' });
    }
    if (isNaN(targetQuantity) || targetQuantity <= 0 || isNaN(campaignPrice) || campaignPrice <= 0) {
        return res.status(400).json({ message: 'Geçersiz hedef miktar veya kampanya fiyatı.' });
    }
    if (new Date(endDate) <= new Date()) {
        return res.status(400).json({ message: 'Bitiş tarihi, şimdiki zamandan sonra olmalıdır.' });
    }

    try {
        // Ürünün varlığını kontrol et
        const productExists = await req.prisma.product.findUnique({ where: { id: productId } });
        if (!productExists) {
            return res.status(404).json({ message: 'Belirtilen ürün bulunamadı.' });
        }

        const newCampaign = await req.prisma.campaign.create({
            data: {
                productId,
                targetQuantity: parseInt(targetQuantity),
                endDate: new Date(endDate),
                campaignPrice: parseFloat(campaignPrice),
                minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity) : undefined,
                maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity) : undefined,
                status: CampaignStatus.ACTIVE, // Yeni kampanya varsayılan olarak aktif başlar
                currentQuantity: 0 // Başlangıçta sipariş adedi 0
            },
        });
        res.status(201).json(newCampaign);
    } catch (error) {
        console.error('Kampanya oluşturma hatası:', error);
        res.status(500).json({ message: 'Kampanya oluşturulurken bir hata oluştu.', error: error.message });
    }
});

// TÜM KAMPANYALARI LİSTELEME (Duruma göre filtreleme de yapılabilir, örn: aktif kampanyalar)
router.get('/', async (req, res) => {
    const { status, productId } = req.query; // status ve productId ile filtreleme
    const filter = {};

    if (status && Object.values(CampaignStatus).includes(status.toUpperCase())) {
        filter.status = status.toUpperCase(); // Enum değeri büyük harf olmalı
    }
    if (productId) {
        filter.productId = productId;
    }

    try {
        const campaigns = await req.prisma.campaign.findMany({
            where: filter,
            include: { product: true }, // Kampanyalarla birlikte ilişkili ürünü de getir
            orderBy: { startDate: 'desc' }
        });
        res.status(200).json(campaigns);
    } catch (error) {
        console.error('Kampanyaları listeleme hatası:', error);
        res.status(500).json({ message: 'Kampanyalar listelenirken bir hata oluştu.', error: error.message });
    }
});

// BELİRLİ BİR KAMPANYAYI ID İLE GETİRME (Detay sayfası için)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const campaign = await req.prisma.campaign.findUnique({
            where: { id: id },
            include: { product: true, orders: true } // İlişkili ürün ve siparişleri de getir
        });
        if (!campaign) {
            return res.status(404).json({ message: 'Kampanya bulunamadı.' });
        }
        res.status(200).json(campaign);
    } catch (error) {
        console.error('Kampanya getirme hatası:', error);
        res.status(500).json({ message: 'Kampanya getirilirken bir hata oluştu.', error: error.message });
    }
});

// KAMPANYA GÜNCELLEME (Sadece Adminler için)
router.put('/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const { targetQuantity, endDate, campaignPrice, status, minOrderQuantity, maxOrderQuantity } = req.body;

    // Güncellenecek alanları içeren bir obje oluştur
    const updateData = {};
    if (targetQuantity !== undefined) {
        if (isNaN(targetQuantity) || targetQuantity <= 0) return res.status(400).json({ message: 'Geçersiz hedef miktar.' });
        updateData.targetQuantity = parseInt(targetQuantity);
    }
    if (endDate !== undefined) {
        if (new Date(endDate) <= new Date()) return res.status(400).json({ message: 'Bitiş tarihi, şimdiki zamandan sonra olmalıdır.' });
        updateData.endDate = new Date(endDate);
    }
    if (campaignPrice !== undefined) {
        if (isNaN(campaignPrice) || campaignPrice <= 0) return res.status(400).json({ message: 'Geçersiz kampanya fiyatı.' });
        updateData.campaignPrice = parseFloat(campaignPrice);
    }
    if (status && Object.values(CampaignStatus).includes(status.toUpperCase())) {
        updateData.status = status.toUpperCase();
    }
    if (minOrderQuantity !== undefined) {
      if (isNaN(minOrderQuantity) || minOrderQuantity < 0) return res.status(400).json({ message: 'Geçersiz minimum sipariş adedi.' });
      updateData.minOrderQuantity = parseInt(minOrderQuantity);
    }
    if (maxOrderQuantity !== undefined) {
      if (isNaN(maxOrderQuantity) || maxOrderQuantity < 0) return res.status(400).json({ message: 'Geçersiz maksimum sipariş adedi.' });
      updateData.maxOrderQuantity = parseInt(maxOrderQuantity);
    }

    updateData.updatedAt = new Date(); // Güncelleme zamanını otomatik ayarla

    try {
        const updatedCampaign = await req.prisma.campaign.update({
            where: { id: id },
            data: updateData
        });
        res.status(200).json(updatedCampaign);
    } catch (error) {
        console.error('Kampanya güncelleme hatası:', error);
        if (error.code === 'P2025') { // Kayıt bulunamadı hatası
            return res.status(404).json({ message: 'Güncellenecek kampanya bulunamadı.' });
        }
        res.status(500).json({ message: 'Kampanya güncellenirken bir hata oluştu.', error: error.message });
    }
});


// KAMPANYA SİLME (Sadece Adminler için)
router.delete('/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // İlişkili siparişler varsa silinmesini engellemek veya cascade delete kullanmak önemlidir.
        // Prisma schema'da cascade delete tanımlanmadıysa, önce ilişkili siparişleri silmek gerekir.
        // Şimdilik, eğer ilişkili siparişler varsa Prisma hata verecektir (P2003).
        const deletedCampaign = await req.prisma.campaign.delete({
            where: { id: id },
        });
        res.status(200).json({ message: 'Kampanya başarıyla silindi.', campaign: deletedCampaign });
    } catch (error) {
        console.error('Kampanya silme hatası:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Silinecek kampanya bulunamadı.' });
        }
        if (error.code === 'P2003') { // Foreign key constraint failed
            return res.status(409).json({ message: 'Bu kampanyaya ait siparişler olduğu için silinemiyor.' });
        }
        res.status(500).json({ message: 'Kampanya silinirken bir hata oluştu.', error: error.message });
    }
});

// Kampanya ilerlemesini (currentQuantity) ve hedefi döndüren rota (app.js'teki /api/count yerine)
router.get('/:id/progress', async (req, res) => {
    const { id } = req.params;
    try {
        const campaign = await req.prisma.campaign.findUnique({
            where: { id: id },
            select: {
                id: true,
                targetQuantity: true,
                currentQuantity: true,
                endDate: true,
                status: true,
                campaignPrice: true,
                product: {
                  select: {
                    name: true,
                    imageUrl: true
                  }
                }
            }
        });

        if (!campaign) {
            return res.status(404).json({ message: 'Kampanya bulunamadı.' });
        }

        // Kalan süreyi hesapla
        const now = new Date();
        const timeLeft = campaign.endDate.getTime() - now.getTime(); // milisaniye cinsinden

        res.status(200).json({
            id: campaign.id,
            targetQuantity: campaign.targetQuantity,
            currentQuantity: campaign.currentQuantity,
            progressPercentage: (campaign.currentQuantity / campaign.targetQuantity) * 100,
            endDate: campaign.endDate,
            timeLeft: timeLeft > 0 ? timeLeft : 0, // Süre dolduysa 0
            status: campaign.status,
            campaignPrice: campaign.campaignPrice,
            productName: campaign.product.name,
            productImageUrl: campaign.product.imageUrl
        });
    } catch (error) {
        console.error('Kampanya ilerlemesi alınırken hata oluştu:', error);
        res.status(500).json({ message: 'Kampanya ilerlemesi alınırken bir hata oluştu.', error: error.message });
    }
});


module.exports = router;