const express = require('express');
// const { PrismaClient } = require('@prisma/client'); // BU SATIRI SİLİN VEYA YORUM SATIRI YAPIN
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

const router = express.Router();
// const prisma = new PrismaClient(); // BU SATIRI SİLİN VEYA YORUM SATIRI YAPIN

// Kullanıcı Kayıt (Register)
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  const prisma = req.prisma; // PrismaClient'ı req objesinden al

  if (!email || !password) {
    return res.status(400).json({ message: 'E-posta ve parola gerekli.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const token = generateToken(user.id);
    res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi.', token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.' });
  }
});

// Kullanıcı Giriş (Login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const prisma = req.prisma; // PrismaClient'ı req objesinden al

  if (!email || !password) {
    return res.status(400).json({ message: 'E-posta ve parola gerekli.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya parola.' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya parola.' });
    }

    const token = generateToken(user.id);
    res.status(200).json({ message: 'Giriş başarılı.', token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ message: 'Giriş sırasında bir hata oluştu.' });
  }
});

module.exports = router;