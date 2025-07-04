// app.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const userRoutes = require('./routes/user');
const authMiddleware = require('./middlewares/authMiddleware'); // authMiddleware'ı import et

const app = express();
const prisma = new PrismaClient(); // PrismaClient örneği burada oluşturuluyor

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

app.use('/api/users', userRoutes);

// Katılımcı ekleme (JOIN) rotası - ARTIK authMiddleware İLE KORUNUYOR
// authMiddleware'i ikinci argüman olarak ekliyoruz
app.post('/api/join', authMiddleware, async (req, res) => {
    // req.user'dan oturum açmış kullanıcının bilgilerine erişebiliriz.
    // Örneğin, hangi kullanıcının katıldığını kaydetmek için req.user.userId kullanabiliriz.
    // Şimdilik sadece e-postayı kullanalım veya req.body'den almaya devam edelim.
    // Eğer sadece login olan kişi kendi e-postasıyla katılabilsin dersek, req.user.email kullanabiliriz.
    const { name, email, card, exp, cvc } = req.body; // Veya email: req.user.email;
    if (!name || !email || !card || !exp || !cvc) {
        return res.status(400).json({ success: false, message: 'Lütfen tüm alanları doldurun.' });
    }

    try {
        const newParticipant = await req.prisma.participant.create({ // req.prisma kullanıyoruz
            data: {
                name,
                email,
                card,
                exp,
                cvc,
            },
        });
        res.status(201).json({ success: true, message: 'Kampanyaya başarıyla katıldınız!', participant: newParticipant });
    } catch (error) {
        console.error('Katılımcı eklenirken hata oluştu:', error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
             return res.status(409).json({ success: false, message: 'Bu e-posta adresi zaten kullanılıyor.' });
        }
        res.status(500).json({ success: false, message: 'Katılım başarısız oldu.', error: error.message });
    }
});

// Katılımcı sayısını alma (COUNT) rotası
app.get('/api/count', async (req, res) => {
    try {
        const count = await req.prisma.participant.count(); // req.prisma kullanıyoruz
        // Kampanya bitiş tarihini de backend'den sağlayabiliriz (örneğin bir sabit olarak veya veritabanından)
        // Eğer veritabanında saklamıyorsak, sabit bir süre belirleyebiliriz.
        // Örnek: Şimdiki zamandan 7 gün sonrası için dinamik bir tarih
        const campaignDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 
        res.json({ success: true, count: count, campaignDeadline: campaignDeadline.toISOString() });
    } catch (error) {
        console.error('Katılımcı sayısı alınırken hata oluştu:', error);
        res.status(500).json({ success: false, message: 'Katılımcı sayısı alınamadı.', error: error.message });
    }
});

// Tüm katılımcıları/siparişleri listeleme rotası (Admin Paneli için)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
      const participants = await req.prisma.participant.findMany({
          orderBy: {
              createdAt: 'desc' // En yeniyi en üste getir
          }
      });
      // Frontend'in beklediği formatta (created_at yerine createdAt) dönüşüm yapalım
      const formattedParticipants = participants.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          card: p.card,
          exp: p.exp,
          cvc: p.cvc,
          // Tarihi daha okunabilir bir formatta döndürelim (isteğe bağlı)
          created_at: p.createdAt.toLocaleString('tr-TR', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
          })
      }));
      res.json({ success: true, orders: formattedParticipants });
  } catch (error) {
      console.error('Siparişler alınırken hata oluştu:', error);
      res.status(500).json({ success: false, message: 'Siparişler alınamadı.', error: error.message });
  }
});

// Katılımcı/Sipariş silme rotası (Admin Paneli için)
app.delete('/api/orders/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
      const deletedParticipant = await req.prisma.participant.delete({
          where: {
              id: id
          }
      });
      res.json({ success: true, message: 'Sipariş başarıyla silindi.', deletedParticipantId: deletedParticipant.id });
  } catch (error) {
      console.error('Sipariş silinirken hata oluştu:', error);
      // Eğer silmeye çalışılan ID bulunamazsa
      if (error.code === 'P2025') {
          return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });
      }
      res.status(500).json({ success: false, message: 'Sipariş silinirken bir hata oluştu.', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Group Buy Backend Çalışıyor!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});