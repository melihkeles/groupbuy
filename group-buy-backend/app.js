const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client'); // PrismaClient'ı buraya taşıdık

const userRoutes = require('./routes/user'); // User router'ı dahil et

const app = express();
const prisma = new PrismaClient(); // PrismaClient örneğini burada oluşturduk

// Middleware'ler
app.use(cors());
app.use(express.json());

// Her request için PrismaClient'ı req objesine ekle (middleware olarak)
app.use((req, res, next) => {
  req.prisma = prisma; // PrismaClient'ı req objesine ekliyoruz
  next();
});

// Route'ları kullan
app.use('/api/users', userRoutes);

// Basit bir test route'ı (isteğe bağlı)
app.get('/', (req, res) => {
  res.send('Group Buy Backend Çalışıyor!');
});

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});