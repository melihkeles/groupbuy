// group-buy-backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // 1. Authorization header'ı kontrol et
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Yetkilendirme tokenı sağlanmadı.' });
    }

    // "Bearer TOKEN_KEY" formatından TOKEN_KEY'i al
    const token = authHeader.split(' ')[1]; // [0] "Bearer", [1] TOKEN_KEY

    if (!token) {
        return res.status(401).json({ success: false, message: 'Yetkilendirme tokenı formatı geçersiz.' });
    }

    try {
        // 2. Token'ı doğrula
        // JWT_SECRET env değişkeninden okunuyor.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Doğrulanmış kullanıcı bilgilerini (örneğin userId, email) isteğe ekle
        req.user = decoded; // req.user.userId ve req.user.email gibi erişebiliriz

        // Bir sonraki middleware veya route handler'a geç
        next();
    } catch (error) {
        // Token doğrulanamazsa (geçersiz, süresi dolmuş vb.)
        console.error('JWT doğrulama hatası:', error.message);
        return res.status(403).json({ success: false, message: 'Geçersiz veya süresi dolmuş yetkilendirme tokenı.' });
    }
};

module.exports = authMiddleware;