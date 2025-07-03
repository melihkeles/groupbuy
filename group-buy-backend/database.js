// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Veritabanı dosyasını backend klasörünün içindeki data.db olarak tanımlar
const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

// Sipariş tablosu varsa oluşturma
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    card TEXT,
    exp TEXT,
    cvc TEXT
  )
`);

module.exports = db;

