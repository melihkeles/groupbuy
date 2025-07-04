require('dotenv').config();

const express = require('express');
const cors = require('cors');

// BU SATIRI KULLANIN:
const { PrismaClient } = require('/Users/melihkeles/groupbuy/group-buy-backend/node_modules/.prisma/client/default.js');

const userRoutes = require('./routes/user');

const app = express();
const prisma = new PrismaClient();

// Middleware'ler
app.use(cors());
app.use(express.json());

// Her request için PrismaClient'ı req objesine ekle
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Route'ları kullan
app.use('/api/users', userRoutes);

// Basit bir test route'ı
app.get('/', (req, res) => {
  res.send('Group Buy Backend Çalışıyor!');
});

// `process.on('beforeExit', ...)` bloğunu şimdilik yorum satırı bırakın
/*
process.on('beforeExit', async () => {
  await disconnectPrisma();
  console.log('Prisma bağlantısı kapatıldı.');
});
*/

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});