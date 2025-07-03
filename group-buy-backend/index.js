const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = 3000;
const TARGET = 500;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Katılım ekleme endpoint'i
app.post('/api/join', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
    if (err) {
      console.log("Veritabanı sayım hatası:", err);
      return res.status(500).json({ success: false, message: 'Veritabanı hatası' });
    }

    const currentCount = row.count;
    console.log("Mevcut kayıt sayısı:", currentCount);

    if (currentCount >= TARGET) {
      console.log("Kampanya dolmuş, kayıt reddedildi.");
      return res.status(400).json({ success: false, message: 'Kampanya tamamlandı. Artık katılım yapılamaz.' });
    }

    const { name, email, card, exp, cvc } = req.body;
    console.log("Yeni kayıt geliyor:", name, email);

    const stmt = db.prepare('INSERT INTO orders (name, email, card, exp, cvc) VALUES (?, ?, ?, ?, ?)');
    stmt.run(name, email, card, exp, cvc, function (err) {
      if (err) {
        console.log("Kayıt hatası:", err);
        res.status(500).json({ success: false, message: 'Kayıt sırasında hata oluştu.' });
      } else {
        console.log("Yeni kayıt eklendi, ID:", this.lastID);
        res.json({ success: true, message: 'Veritabanına kaydedildi' });
      }
    });
    stmt.finalize();
  });
});

// Katılımcı sayısını döndürme
app.get('/api/count', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
    if (err) {
      res.status(500).json({ success: false });
    } else {
      res.json({ success: true, count: row.count });
    }
  });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
