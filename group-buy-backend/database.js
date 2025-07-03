// group-buy-backend/database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./orders.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Veritabanına bağlandı.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    card TEXT NOT NULL,
    exp TEXT NOT NULL,
    cvc TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;