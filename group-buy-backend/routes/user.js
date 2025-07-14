// group-buy-backend/routes/user.js

const express = require('express');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const authMiddleware = require('../middlewares/authMiddleware').authMiddleware; // authMiddleware'ı import et

const router = express.Router();

// Kullanıcı Kayıt (Register)
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: 'E-posta, parola ve ad gerekli.' });
  }

  try {
    const existingUser = await req.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı.' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await req.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const token = generateToken(user.id, user.role, user.name, user.email);
    res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi.', token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.' });
  }
});

// Kullanıcı Giriş (Login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'E-posta ve parola gerekli.' });
  }

  try {
    const user = await req.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya parola.' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya parola.' });
    }

    const token = generateToken(user.id, user.role, user.name, user.email);
    res.status(200).json({ message: 'Giriş başarılı.', token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ message: 'Giriş sırasında bir hata oluştu.' });
  }
});

// Kullanıcının kendi profil bilgilerini alma rotası
router.get('/me', authMiddleware, async (req, res) => {
  try {
      const userId = req.user.userId;

      const user = await req.prisma.user.findUnique({
          where: {
              id: userId
          },
          select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
              role: true
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

module.exports = router;