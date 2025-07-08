// common.js'den gelen fonksiyonlar ve değişkenler
// BASE_URL, showNotification, checkLoginStatus vb.

document.addEventListener('DOMContentLoaded', () => {
    // Navigasyon butonlarını güncelle (common.js'de tanımlandıysa bu çağrıya gerek kalmaz)
    // Eğer common.js'deki updateNavigationButtons() fonksiyonu bu butonları yönetiyorsa
    // login.html ve register.html'deki butonların display:none; stilini kaldırabilirsiniz.
    // updateNavigationButtons();

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const submitButton = e.target.querySelector('button[type="submit"]');

        if (!email || !password) {
            showNotification("Lütfen tüm alanları doldurun.", "error", 'notification');
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = 'Giriş Yapılıyor... <span class="spinner"></span>';
        submitButton.classList.add('loading');

        try {
            const response = await fetch(`${BASE_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) { // HTTP status 200-299
                showNotification(data.message, "success", 'notification');
                localStorage.setItem('userToken', data.token); // Token'ı kaydet
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                showNotification(data.message || 'Giriş başarısız oldu.', 'error', 'notification');
            }
        } catch (error) {
            console.error('Giriş sırasında hata:', error);
            showNotification('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.', 'error', 'notification');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Giriş Yap';
            submitButton.classList.remove('loading');
        }
    });
});