// group-buy-backend/routes/order.js
const express = require('express');
const router = express.Router();


const { authMiddleware, adminAuthMiddleware } = require('../middlewares/authMiddleware');
const { CampaignStatus, OrderStatus } = require('@prisma/client'); // Enumları import et

// YENİ BİR SİPARİŞ OLUŞTURMA (Kampanyaya Katılma)
// Bu, önceki app.js'teki '/api/join' rotasının yerini alacak.
router.post('/', authMiddleware, async (req, res) => {
    const userId = req.user.userId; // authMiddleware'dan gelen kullanıcı ID'si
    const { campaignId, quantity, addressId } = req.body; // quantity ve addressId eklendi

    if (!userId || !campaignId || !quantity || !addressId) {
        return res.status(400).json({ message: 'Kampanya ID, miktar ve teslimat adresi zorunludur.' });
    }
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Geçersiz sipariş miktarı.' });
    }

    try {
        // 1. Kampanyayı bul ve kontrol et
        const campaign = await req.prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { product: true }
        });

        if (!campaign) {
            return res.status(404).json({ message: 'Kampanya bulunamadı.' });
        }
        if (campaign.status !== CampaignStatus.ACTIVE) {
            return res.status(400).json({ message: 'Kampanya aktif değil, sipariş alınamıyor.' });
        }
        if (new Date() > campaign.endDate) {
            // Kampanya süresi dolmuşsa status'ü güncelle (bu cron job ile daha iyi yapılır)
            await req.prisma.campaign.update({
              where: { id: campaignId },
              data: { status: CampaignStatus.FAILED }
            });
            return res.status(400).json({ message: 'Kampanyanın süresi doldu.' });
        }
        if (quantity < campaign.minOrderQuantity || (campaign.maxOrderQuantity && quantity > campaign.maxOrderQuantity)) {
          return res.status(400).json({ message: `Sipariş miktarı ${campaign.minOrderQuantity} ile ${campaign.maxOrderQuantity || 'sınırsız'} arasında olmalıdır.` });
        }
        // Yeterli stok var mı kontrolü (opsiyonel ama iyi bir pratik)
        if (campaign.product.stockQuantity < quantity) {
            return res.status(400).json({ message: 'Yeterli stok bulunmamaktadır.' });
        }

        // 2. Kullanıcının adresini kontrol et (seçilen adresin kullanıcıya ait olduğundan emin olmak için)
        const userAddress = await req.prisma.address.findUnique({
            where: { id: addressId, userId: userId }
        });
        if (!userAddress) {
            return res.status(404).json({ message: 'Geçersiz veya size ait olmayan teslimat adresi.' });
        }

        const totalAmount = quantity * campaign.campaignPrice;

        // 3. Siparişi oluştur
        const newOrder = await req.prisma.order.create({
            data: {
                userId,
                campaignId,
                quantity: parseInt(quantity),
                unitPrice: campaign.campaignPrice, // Sipariş anındaki birim fiyatı kaydet
                totalAmount: totalAmount,
                status: OrderStatus.PAID, // Ödeme başarılı varsayılırsa PAID, ödeme entegrasyonu varsa PENDING
                addressId: addressId // Seçilen adresin ID'sini kaydet
            },
        });

        // 4. Kampanyanın mevcut sipariş adedini güncelle
        const updatedCampaign = await req.prisma.campaign.update({
            where: { id: campaignId },
            data: {
                currentQuantity: {
                    increment: parseInt(quantity), // Sipariş adedini mevcut adede ekle
                },
            },
        });

        // 5. Eğer kampanya hedef sayıya ulaştıysa durumunu güncelle
        if (updatedCampaign.currentQuantity >= updatedCampaign.targetQuantity && updatedCampaign.status === CampaignStatus.ACTIVE) {
            await req.prisma.campaign.update({
                where: { id: campaignId },
                data: { status: CampaignStatus.COMPLETED },
            });
            console.log(`Kampanya ID ${campaignId} başarıyla tamamlandı!`);
            // Burada kampanya tamamlandığında tetiklenecek ek mantıklar olabilir
            // Örneğin: Üreticiye otomatik sipariş geçme, müşterilere bildirim gönderme vb.
        }

        res.status(201).json({ message: 'Sipariş başarıyla oluşturuldu ve kampanyaya eklendi!', order: newOrder });

    } catch (error) {
        console.error('Sipariş oluşturma hatası:', error);
        res.status(500).json({ message: 'Sipariş oluşturulurken bir hata oluştu.', error: error.message });
    }
});

// KULLANICININ KENDİ SİPARİŞLERİNİ LİSTELEME (app.js'deki '/api/users/me/participations' yerine)
router.get('/me', authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    try {
        const orders = await req.prisma.order.findMany({
            where: { userId: userId },
            include: {
                campaign: {
                    include: { product: true }
                },
                address: true,
                user: { // Burayı ekliyoruz
                    select: { email: true } // Sadece e-posta adresini seç
                }
            },
            orderBy: { orderDate: 'desc' }
        });

        // Frontend'e gönderirken e-postayı doğrudan erişilebilir hale getirmek için map kullanabilirsiniz
        const formattedOrders = orders.map(order => ({
            ...order,
            email: order.user.email // Kullanıcının e-postasını doğrudan sipariş objesine ekle
        }));

        res.status(200).json({ success: true, participations: formattedOrders });
    } catch (error) {
        console.error('Kullanıcı siparişleri alınırken hata oluştu:', error);
        res.status(500).json({ success: false, message: 'Siparişler alınamadı.', error: error.message });
    }
});

// BELİRLİ BİR SİPARİŞİ ID İLE GETİRME (Kullanıcı kendi siparişini veya admin herhangi bir siparişi)
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role; // authMiddleware'dan gelen rol

    try {
        const order = await req.prisma.order.findUnique({
            where: { id: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true } // Kullanıcı bilgilerini seçici getir
                },
                campaign: {
                    include: { product: true }
                },
                address: true
            }
        });

        if (!order) {
            return res.status(404).json({ message: 'Sipariş bulunamadı.' });
        }

        // Eğer kullanıcı kendi siparişini istemiyorsa ve admin değilse erişimi engelle
        if (order.userId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Bu siparişe erişim izniniz yok.' });
        }

        res.status(200).json(order);
    } catch (error) {
        console.error('Sipariş getirme hatası:', error);
        res.status(500).json({ message: 'Sipariş getirilirken bir hata oluştu.', error: error.message });
    }
});


// TÜM SİPARİŞLERİ LİSTELEME (Admin Paneli için, app.js'deki '/api/orders' yerine)
// Bu rota, 'formattedOrders' mapping'ini içerdiği için doğru olan ve kalması gerekendir.
router.get('/', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        const orders = await req.prisma.order.findMany({
            include: {
                user: {
                    select: {
                        name: true,  // Kullanıcının adını al
                        email: true  // Kullanıcının e-postasını al
                    }
                },
                campaign: {
                    include: { product: true }
                },
                address: true
            },
            orderBy: { createdAt: 'desc' } // Prisma'da tarih alanı genellikle 'createdAt' olarak adlandırılır.
        });

        // Backend'den gelen veriyi frontend'in beklediği formata dönüştür
        const formattedOrders = orders.map(order => ({
            id: order.id,
            // 'name' ve 'email' alanlarını order.user objesinden çekiyoruz
            // Eğer user objesi null ise varsayılan değer veriyoruz
            name: order.user ? order.user.name : 'Bilinmiyor',
            email: order.user ? order.user.email : 'Bilinmiyor',
            // 'createdAt' alanını doğrudan kullanıyoruz.
            // Frontend'de new Date() ile doğru şekilde parse edilmesi gerekiyor.
            created_at: order.createdAt, // Prisma'daki kesin alan adını kullanın. Genelde createdAt'tır.
            // Diğer sipariş detayları eklenebilir
            campaign: order.campaign,
            address: order.address,
            status: order.status,
            quantity: order.quantity,
            totalAmount: order.totalAmount,
            unitPrice: order.unitPrice,
            // ... diğer alanlar
        }));

        res.status(200).json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error('Tüm siparişleri alma hatası (Admin Paneli):', error);
        res.status(500).json({ success: false, message: 'Siparişler alınamadı.', error: error.message });
    }
});


// SİPARİŞ DURUMUNU GÜNCELLEME (Sadece Adminler için)
router.put('/:id/status', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status.toUpperCase())) {
        return res.status(400).json({ message: 'Geçersiz sipariş durumu.' });
    }

    try {
        const updatedOrder = await req.prisma.order.update({
            where: { id: id },
            data: {
                status: status.toUpperCase(),
                updatedAt: new Date()
            },
        });
        res.status(200).json({ message: 'Sipariş durumu başarıyla güncellendi.', order: updatedOrder });
    } catch (error) {
        console.error('Sipariş durumu güncelleme hatası:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Güncellenecek sipariş bulunamadı.' });
        }
        res.status(500).json({ message: 'Sipariş durumu güncellenirken bir hata oluştu.', error: error.message });
    }
});


// SİPARİŞ SİLME (Sadece Adminler için, app.js'deki '/api/orders/:id' DELETE yerine)
router.delete('/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const deletedOrder = await req.prisma.order.delete({
            where: { id: id },
        });
        // Sipariş silinince ilgili kampanyanın currentQuantity'sini düşürmek gerekebilir.
        // Bu daha sonra ele alınabilir karmaşık bir durum (iade/iptal mantığına bağlı).
        // Şimdilik sadece silinsin.
        res.status(200).json({ message: 'Sipariş başarıyla silindi.', order: deletedOrder });
    } catch (error) {
        console.error('Sipariş silme hatası:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Silinecek sipariş bulunamadı.' });
        }
        res.status(500).json({ message: 'Sipariş silinirken bir hata oluştu.', error: error.message });
    }
});


module.exports = router;