// app.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path'); // path modülünü ekliyoruz

// Rota dosyalarını import et
const userRoutes = require('./routes/user');
const addressRoutes = require('./routes/address');
const productRoutes = require('./routes/product'); // YENİ: Product rotası
const campaignRoutes = require('./routes/campaign'); // YENİ: Campaign rotası (birazdan oluşturacağız)
const orderRoutes = require('./routes/order');       // YENİ: Order rotası (birazdan oluşturacağız)

// Middleware'leri import et
const { authMiddleware, adminAuthMiddleware } = require('./middlewares/authMiddleware');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// 1. group-buy-frontend klasörünü kök olarak servis et
// Bu, index.html, account.html, common.js, style.css gibi dosyaların doğrudan erişilebilir olmasını sağlar.
app.use(express.static(path.join(__dirname, '..', 'group-buy-frontend')));

// 2. Özellikle public klasörü içindeki (ve altındaki) dosyaları da servis et
// Bu, public/data/turkiye-il-ilce.json gibi dosyaların /data/turkiye-il-ilce.json adresinden erişilmesini sağlar.
// Eğer yukarıdaki static zaten tüm frontend'i servis ediyorsa ve public de onun içindeyse bu satıra gerek kalmayabilir
// Ancak netlik için ve public'in ayrı bir kök gibi davranabilmesi için ekleyebiliriz.
// Eğer 'public' içindeki dosyalara direk /public/dosyaadi şeklinde erişilmesini istemiyorsanız, sadece yukarıdaki yeterlidir.
// Eğer mevcut frontend kodunuzda hala /data/... şeklinde istek yapılıyorsa bu gereklidir.
app.use(express.static(path.join(__dirname, '..', 'group-buy-frontend', 'public')));

// PrismaClient'ı req objesine ekle
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Temel rotalar
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/products', productRoutes);      // Product rotalarını bağla
app.use('/api/campaigns', campaignRoutes);    // Campaign rotalarını bağla
app.use('/api/orders', orderRoutes);          // Order rotalarını bağla

// 1. Sağlık kontrolü veya genel backend durumu için özel bir rota (opsiyonel ama iyi bir pratik)
// Bu, API endpoint'lerinizden biri olmalı, genellikle '/api/status' gibi.
// Eğer bu rotayı tutmak istiyorsanız, '/api' prefixi verin.
app.get('/api/status', (req, res) => {
  res.send('Group Buy Backend Çalışıyor ve API istekleri hazır!');
});

// 2. Catch-all (tümünü yakala) rotası, TÜM DİĞER API ve STATİK ROTALARDAN SONRA GELMELİDİR.
// Bu rota, Express sunucusuna gelen ve yukarıdaki hiçbir API veya statik dosya isteğine uymayan tüm GET isteklerini yakalar.
// Amacı, frontend uygulamasının ana HTML dosyasını göndermek ve böylece frontend'deki client-side routing'in çalışmasını sağlamaktır.
app.get('*', (req, res) => {
  // Frontend'in ana HTML dosyasını gönder.
  // Bu durumda 'group-buy-frontend' klasörünün kökünde olduğu için yolu belirtiyoruz.
  res.sendFile(path.join(__dirname, '..', 'group-buy-frontend', 'index.html'));
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});