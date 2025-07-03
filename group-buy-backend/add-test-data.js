// add-test-data.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./orders.db', (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Veritabanına bağlandı.');
});

const TARGET_COUNT = 500; // Kaç sipariş eklemek istediğiniz
let currentCount = 0;

db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
    if (err) {
        console.error("Mevcut sayıyı alırken hata:", err);
        return;
    }
    currentCount = row.count;
    console.log(`Mevcut kayıt sayısı: ${currentCount}`);

    if (currentCount >= TARGET_COUNT) {
        console.log(`Zaten ${TARGET_COUNT} veya daha fazla kayıt var.`);
        db.close();
        return;
    }

    const recordsToAdd = TARGET_COUNT - currentCount;
    const stmt = db.prepare('INSERT INTO orders (name, email, card, exp, cvc, created_at) VALUES (?, ?, ?, ?, ?, ?)');

    db.serialize(() => {
        for (let i = 0; i < recordsToAdd; i++) {
            const name = `Test User ${currentCount + i + 1}`;
            const email = `test_user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}@example.com`;
            const card = '1111222233334444';
            const exp = '12/25';
            const cvc = '123';
            const createdAt = new Date().toISOString();

            stmt.run(name, email, card, exp, cvc, createdAt, function(err) {
                if (err) {
                    // Unique email hatasını yakalamak için
                    if (err.message.includes("UNIQUE constraint failed: orders.email")) {
                        console.warn(`Email zaten var: ${email}. Bu kaydı atlıyorum.`);
                    } else {
                        console.error(`Kayıt eklerken hata (${email}):`, err.message);
                    }
                } else {
                    // console.log(`Eklendi: ID ${this.lastID}, Email: ${email}`);
                }
            });
        }
        stmt.finalize(() => {
            console.log(`${recordsToAdd} potansiyel kayıt ekleme işlemi tamamlandı.`);
            db.close(() => {
                console.log('Veritabanı bağlantısı kapandı.');
                console.log('Admin panelini kontrol edebilirsiniz.');
            });
        });
    });
});