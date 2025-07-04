const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET; // .env dosyasından alacak

// Parolayı hash'leme fonksiyonu
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10); // Salt oluştur
  return bcrypt.hash(password, salt); // Parolayı hash'le
};

// Parolayı doğrulama fonksiyonu
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword); // Hash'lenmiş parolayı karşılaştır
};

// JWT oluşturma fonksiyonu
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' }); // 1 saat geçerli token
};

// JWT doğrulama (middleware olarak kullanılacak)
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Header'dan token'ı al

  if (!token) {
    return res.status(401).json({ message: 'Erişim reddedildi, token bulunamadı.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Token'ı doğrula
    req.userId = decoded.userId; // Doğrulanmış kullanıcı ID'sini request objesine ekle
    next(); // Bir sonraki middleware'e veya route handler'a geç
  } catch (error) {
    res.status(401).json({ message: 'Geçersiz token.' });
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};