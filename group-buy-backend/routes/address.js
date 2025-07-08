const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware'); // authMiddleware'ı import et

const router = express.Router();

// Middleware'ı tüm adres rotalarına uygulayalım, böylece her istekte token kontrolü yapılır
router.use(authMiddleware);

// --- Adres Yönetimi Rotaları ---

// 1. Kullanıcının tüm adreslerini listeleme (GET /api/addresses)
router.get('/', async (req, res) => {
  const prisma = req.prisma;
  const userId = req.user.userId; // authMiddleware'dan gelen userId

  try {
    const addresses = await prisma.address.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json({ success: true, addresses });
  } catch (error) {
    console.error('Adresler alınırken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Adresler alınırken bir hata oluştu.', error: error.message });
  }
});

// 2. Yeni adres ekleme (POST /api/addresses)
router.post('/', async (req, res) => {
  const prisma = req.prisma;
  const userId = req.user.userId;
  const { title, fullName, phone, country, city, district, neighborhood, addressLine1, addressLine2, zipCode, isDefault } = req.body;

  // Temel doğrulama
  if (!fullName || !phone || !country || !city || !addressLine1) {
    return res.status(400).json({ success: false, message: 'Lütfen zorunlu adres alanlarını doldurun (Ad Soyad, Telefon, Ülke, Şehir, Adres Satırı 1).' });
  }

  try {
    // Eğer isDefault true ise, kullanıcının mevcut varsayılan adresini false yap
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: userId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: userId,
        title: title || null,
        fullName,
        phone,
        country,
        city,
        district: district || null,
        neighborhood: neighborhood || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        zipCode: zipCode || null,
        isDefault: isDefault || false
      },
    });
    res.status(201).json({ success: true, message: 'Adres başarıyla eklendi.', address: newAddress });
  } catch (error) {
    console.error('Adres eklenirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Adres eklenirken bir hata oluştu.', error: error.message });
  }
});

// 3. Adres güncelleme (PUT /api/addresses/:id)
router.put('/:id', async (req, res) => {
  const prisma = req.prisma;
  const userId = req.user.userId;
  const { id } = req.params; // Güncellenecek adresin ID'si
  const { title, fullName, phone, country, city, district, neighborhood, addressLine1, addressLine2, zipCode, isDefault } = req.body;

  try {
    // Güncellenecek adresin mevcut kullanıcıya ait olduğunu kontrol et
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({ success: false, message: 'Adres bulunamadı veya bu adresi güncelleme yetkiniz yok.' });
    }

    // Eğer isDefault true olarak ayarlanıyorsa, kullanıcının diğer varsayılan adreslerini false yap
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: userId,
          isDefault: true,
          NOT: { id: id } // Güncellenen adres hariç
        },
        data: {
          isDefault: false
        }
      });
    } else if (existingAddress.isDefault && !isDefault) {
      // Eğer mevcut adres varsayılan ise ve yeni istekte varsayılan değilse
      // Ve kullanıcının başka adresi varsa, varsayılanı başka bir adrese taşıyabiliriz
      // Ancak şimdilik sadece bu adresi varsayılan olmaktan çıkaralım.
      // İleride, varsayılan adres kaldırıldığında başka birini varsayılan yapma mantığı eklenebilir.
    }


    const updatedAddress = await prisma.address.update({
      where: {
        id: id
      },
      data: {
        title: title !== undefined ? title : existingAddress.title, // Undefined ise mevcut değeri koru
        fullName: fullName || existingAddress.fullName,
        phone: phone || existingAddress.phone,
        country: country || existingAddress.country,
        city: city || existingAddress.city,
        district: district !== undefined ? district : existingAddress.district,
        neighborhood: neighborhood !== undefined ? neighborhood : existingAddress.neighborhood,
        addressLine1: addressLine1 || existingAddress.addressLine1,
        addressLine2: addressLine2 !== undefined ? addressLine2 : existingAddress.addressLine2,
        zipCode: zipCode !== undefined ? zipCode : existingAddress.zipCode,
        isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault
      }
    });
    res.json({ success: true, message: 'Adres başarıyla güncellendi.', address: updatedAddress });
  } catch (error) {
    console.error('Adres güncellenirken hata oluştu:', error);
    if (error.code === 'P2025') { // Kayıt bulunamadı hatası
      return res.status(404).json({ success: false, message: 'Güncellenmek istenen adres bulunamadı.' });
    }
    res.status(500).json({ success: false, message: 'Adres güncellenirken bir hata oluştu.', error: error.message });
  }
});

// 4. Adres silme (DELETE /api/addresses/:id)
router.delete('/:id', async (req, res) => {
  const prisma = req.prisma;
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    // Silinecek adresin mevcut kullanıcıya ait olduğunu kontrol et
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!existingAddress) {
      return res.status(404).json({ success: false, message: 'Adres bulunamadı veya bu adresi silme yetkiniz yok.' });
    }

    // Eğer silinmek istenen adres varsayılan adres ise, ne yapılacağına karar ver
    // Şimdilik sadece silinmesine izin verelim. İleride, başka bir adres varsa onu varsayılan yapabiliriz.
    if (existingAddress.isDefault) {
      const otherAddressesCount = await prisma.address.count({
          where: {
              userId: userId,
              NOT: { id: id }
          }
      });
      if (otherAddressesCount > 0) {
          // Eğer başka adresler varsa, ilk bulduğumuzu varsayılan yapalım
          const firstOtherAddress = await prisma.address.findFirst({
              where: {
                  userId: userId,
                  NOT: { id: id }
              },
              orderBy: {
                  createdAt: 'asc'
              }
          });
          if (firstOtherAddress) {
              await prisma.address.update({
                  where: { id: firstOtherAddress.id },
                  data: { isDefault: true }
              });
          }
      }
    }

    const deletedAddress = await prisma.address.delete({
      where: {
        id: id
      }
    });
    res.json({ success: true, message: 'Adres başarıyla silindi.', deletedAddressId: deletedAddress.id });
  } catch (error) {
    console.error('Adres silinirken hata oluştu:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Silinmek istenen adres bulunamadı.' });
    }
    res.status(500).json({ success: false, message: 'Adres silinirken bir hata oluştu.', error: error.message });
  }
});

module.exports = router;