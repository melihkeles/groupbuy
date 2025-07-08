// app.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const userRoutes = require('./routes/user');
const addressRoutes = require('./routes/address');
const { authMiddleware, adminAuthMiddleware } = require('./middlewares/authMiddleware'); // Buradan import et

const app = express();
const prisma = new PrismaClient(); // PrismaClient örneği burada oluşturuluyor

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);

// Katılımcı ekleme (JOIN) rotası - ARTIK authMiddleware İLE KORUNUYOR
// authMiddleware'i ikinci argüman olarak ekliyoruz
app.post('/api/join', authMiddleware, async (req, res) => {
    if (!req.user || !req.user.userId) { // authMiddleware'ınızın req.user.userId sağladığını varsayıyoruz
        return res.status(401).json({ success: false, message: 'Oturum açmış kullanıcı bilgisi bulunamadı. Katılmak için giriş yapmalısınız.' });
    }
    const userId = req.user.userId; // Oturum açmış kullanıcının ID'si

    const { name, email, card, exp, cvc } = req.body; 
    
    // Güvenlik için e-postayı auth'tan almak daha iyi olabilir:
    // const email = req.user.email; 

    if (!name || !email || !card || !exp || !cvc) {
        return res.status(400).json({ success: false, message: 'Lütfen tüm alanları doldurun.' });
    }

    try {
        const newParticipant = await req.prisma.participant.create({
            data: {
                userId: userId, // <<<-- Bu satırı ekledik!
                name,
                email,
                //card,
                //exp,
                //cvc,
            },
        });
        console.log(`Simülasyon: Kullanıcı ${name} (${email}) kampanyaya katıldı. Kart bilgileri depolanmadı.`);
        res.status(201).json({ success: true, message: 'Kampanyaya başarıyla katıldınız! (Ödeme bilgileri işlenmedi/depolanmadı)' });
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
app.get('/api/orders', authMiddleware, adminAuthMiddleware, async (req, res) => {
    try {
        const participants = await req.prisma.participant.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        // Frontend'in beklediği formatta dönüşüm yapalım
        const formattedParticipants = participants.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            card: p.card,
            exp: p.exp,
            cvc: p.cvc,
            // !!! BURAYI GÜNCELLE: createdAt'ı ISO string olarak gönder !!!
            created_at: p.createdAt.toISOString() 
        }));
        res.json({ success: true, orders: formattedParticipants });
    } catch (error) {
        console.error('Siparişler alınırken hata oluştu:', error);
        res.status(500).json({ success: false, message: 'Siparişler alınamadı.', error: error.message });
    }
  });

// Katılımcı/Sipariş silme rotası (Admin Paneli için)
app.delete('/api/orders/:id', authMiddleware, adminAuthMiddleware, async (req, res) => {
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

// Kullanıcının kendi profil bilgilerini alma rotası
// Sadece giriş yapmış kullanıcılar kendi bilgilerini görebilir
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
      // authMiddleware'dan gelen req.user objesindeki userId'yi kullanıyoruz
      const userId = req.user.userId;

      const user = await req.prisma.user.findUnique({
          where: {
              id: userId
          },
          select: { // Hassas bilgileri (şifre gibi) göndermemek için seçici davranıyoruz
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true
          }
      });

      if (!user) {
          return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
      }

      res.json({ success: true, user: user });

  } catch (error) {
      console.error('Kullanıcı profil bilgileri alınırken hata oluştu:', error);
      res.status(500).json({ success: false, message: 'Profil bilgileri alınamadı.', error: error.message });
  }
});

// Giriş yapmış kullanıcının kendi katılımlarını listeleme rotası
// Sadece giriş yapmış kullanıcılar kendi katılımlarını görebilir
// NOT: Bu rota Participant modelinde userId alanı olduğunu varsayar.
// Şu anki Participant modelinizde userId alanı yok. Bunu eklememiz gerek.
app.get('/api/users/me/participations', authMiddleware, async (req, res) => {
  try {
      const userId = req.user.userId;

      // Burada iki seçeneğimiz var:
      // 1. Participant modeline userId alanı eklemek (TERCİH EDİLİR VE DAHA DOĞRU)
      // 2. Participant email'i ile User email'i eşleşenleri bulmak (Geçici çözüm, daha az güvenilir)

      // Şimdilik 2. seçeneği kullanacağım, ancak en doğrusu 1. seçenektir.
      // Eğer Participant modelinize userId eklemek isterseniz, bana bildirin,
      // Prisma schema'yı ve 'join' rotasını güncelleriz.

const participations = await req.prisma.participant.findMany({
    where: {
        userId: userId // Participant modelindeki userId alanına göre filtreleyin
    },
    orderBy: {
        createdAt: 'desc'
    }
});

      res.json({ success: true, participations: participations });

  } catch (error) {
      console.error('Kullanıcı katılımları alınırken hata oluştu:', error);
      res.status(500).json({ success: false, message: 'Katılımlar alınamadı.', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Group Buy Backend Çalışıyor!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});