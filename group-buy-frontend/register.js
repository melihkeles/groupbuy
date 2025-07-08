// common.js'den gelen fonksiyonlar ve değişkenler
// BASE_URL, showNotification, checkLoginStatus vb.

document.addEventListener('DOMContentLoaded', () => {
    // Navigasyon butonlarını güncelle (common.js'de tanımlandıysa bu çağrıya gerek kalmaz)
    // updateNavigationButtons();

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const submitButton = e.target.querySelector('button[type="submit"]');

        if (!name || !email || !password || !confirmPassword) {
            showNotification("Lütfen tüm alanları doldurun.", "error", 'notification');
            return;
        }

        if (password !== confirmPassword) {
            showNotification("Şifreler uyuşmuyor.", "error", 'notification');
            return;
        }

        if (password.length < 6) {
            showNotification("Şifre en az 6 karakter olmalıdır.", "error", 'notification');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = 'Kayıt Olunuyor... <span class="spinner"></span>';
        submitButton.classList.add('loading');

        try {
            const response = await fetch(`${BASE_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) { // HTTP status 200-299
                showNotification(data.message || "Kayıt başarılı!", "success", 'notification');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                showNotification(data.message || 'Kayıt başarısız oldu.', 'error', 'notification');
            }
        } catch (error) {
            console.error('Kayıt sırasında hata:', error);
            showNotification('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.', 'error', 'notification');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Kayıt Ol';
            submitButton.classList.remove('loading');
        }
    });
});