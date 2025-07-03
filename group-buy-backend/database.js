// database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(__dirname + '/data.db');

// Kampanya katılımlarını tutacak tablo
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    card TEXT,
    exp TEXT,
    cvc TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

module.exports = db;
