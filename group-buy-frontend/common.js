const BASE_URL = 'http://localhost:8080/api'; // BASE_URL'i buraya taşıdık

function getUserToken() {
return localStorage.getItem('userToken');
}

function removeUserToken() {
localStorage.removeItem('userToken');
}

function logoutUser() {
removeUserToken();
window.location.href = 'login.html';
}

// Token'ı çözümleme fonksiyonu (YENİ EKLENEN)
function decodeToken(token) {
    if (!token) return null;
    try {
        // Token'ın payload kısmını al (ikinci bölüm)
        const base64Url = token.split('.')[1];
        // Base64 URL Safe'den Base64'e dönüştür ve decode et
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Token çözümlenirken hata oluştu:", e);
        return null;
    }
}

// Navigasyon için checkLoginStatus
function checkLoginStatus() {
    const token = getUserToken();
    const welcomeMessage = document.getElementById('welcome-message');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const logoutButton = document.getElementById('logout-button');
    const accountButton = document.getElementById('account-button'); // <<<-- BURAYI DEĞİŞTİRİN
    const adminButton = document.getElementById('admin-button');

    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (welcomeMessage) {
                welcomeMessage.textContent = `Hoş geldiniz, ${payload.name || payload.username || 'Kullanıcı'}!`;
            }

            // Butonların display ayarlarını yapın
            if (loginButton) loginButton.style.display = 'none';
            if (registerButton) registerButton.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'inline-block';
            if (accountButton) accountButton.style.display = 'inline-block'; // <<<-- BURAYI DEĞİŞTİRİN

            // Admin butonu görünürlüğünü rol'e göre ayarla
            if (adminButton) {
                if (payload.role && payload.role === 'ADMIN') {
                    adminButton.style.display = 'inline-block';
                } else {
                    adminButton.style.display = 'none';
                }
            }

        } catch (e) {
            console.error("Token çözümlenirken hata:", e);
            logoutUser();
        }
    } else {
        // Kullanıcı giriş yapmamışsa bu kısım çalışır
        if (welcomeMessage) {
            welcomeMessage.textContent = '';
        }

        // Butonların display ayarlarını yapın
        if (loginButton) loginButton.style.display = 'inline-block';
        if (registerButton) registerButton.style.display = 'inline-block';
        if (logoutButton) logoutButton.style.display = 'none';
        if (accountButton) accountButton.style.display = 'none'; // <<<-- BURAYI DEĞİŞTİRİN
        if (adminButton) adminButton.style.display = 'none';
    }
}


// Navigasyon butonlarına olay dinleyicileri ekle
// HTML elemanlarının mevcut olup olmadığını kontrol ederek listener ekliyoruz
document.addEventListener('DOMContentLoaded', () => {
// Bu listener'ların sadece ilgili butonlar varsa eklenmesi en sağlıklısı.
// Tüm sayfalarda aynı butonların olmasını bekleyerek kodluyorum.
// Eğer bir sayfada bir buton yoksa, o buton için `null` dönecektir, bu da hata yaratmaz.

const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const logoutButton = document.getElementById('logout-button');
    const accountButton = document.getElementById('account-button'); // <<<-- BURAYI DEĞİŞTİRİN
    const adminButton = document.getElementById('admin-button');

    if (loginButton) {
        loginButton.addEventListener('click', () => { window.location.href = 'login.html'; });
    }
    if (registerButton) {
        registerButton.addEventListener('click', () => { window.location.href = 'register.html'; });
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', logoutUser);
    }
    if (accountButton) { // <<<-- BURAYI DEĞİŞTİRİN
        accountButton.addEventListener('click', () => { window.location.href = 'account.html'; }); // <<<-- BURAYI DEĞİŞTİRİN
    }
    if (adminButton) {
        adminButton.addEventListener('click', () => { window.location.href = 'admin.html'; });
    }

    // Sayfa yüklendiğinde navigasyon durumunu kontrol et
    checkLoginStatus();
});

// Eğer sayfada bildirim div'i varsa kullanmak için
function showNotification(message, type = 'success', notificationDivId = 'notification') {
    const notificationDiv = document.getElementById(notificationDivId);
    if (!notificationDiv) {
        console.warn(`Notification div with ID '${notificationDivId}' not found.`);
        // Belki bir alert ile yedek çözüm sunulabilir
        // alert(`${type.toUpperCase()}: ${message}`);
        return;
    }

    // Önceki sınıfları temizle
    notificationDiv.classList.remove('visible', 'success', 'error');
    notificationDiv.style.display = 'none'; // Gizle

    // Mesajı ve tipi ayarla
    notificationDiv.textContent = message;
    notificationDiv.classList.add(type);

    // Görünür yap ve animasyonu başlat
    notificationDiv.style.display = 'block';
    // Küçük bir gecikme ekleyerek geçiş efektinin çalışmasını sağla
    setTimeout(() => {
        notificationDiv.classList.add('visible');
    }, 10); // 10ms gecikme

    // Belirli bir süre sonra otomatik gizle (sadece genel bildirim için)
    if (notificationDivId === 'notification') { // Sadece genel bildirim için otomatik gizle
        setTimeout(() => {
            notificationDiv.classList.remove('visible');
            // Geçiş tamamlandıktan sonra display'i kapat
            notificationDiv.addEventListener('transitionend', function handler() {
                notificationDiv.style.display = 'none';
                notificationDiv.removeEventListener('transitionend', handler);
            });
        }, 3000); // 3 saniye sonra gizle
    }
    // account.html'deki 'account-notification' ve 'modal-address-notification' otomatik gizlenmeyecek.
}

// Input formatlama fonksiyonları
function formatCardNumber(event) {
    let input = event.target.value.replace(/\D/g, '');
    input = input.substring(0, 16);
    let formattedInput = '';
    for (let i = 0; i < input.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedInput += ' ';
        }
        formattedInput += input[i];
    }
    event.target.value = formattedInput;
}

function formatExpiryDate(event) {
    let input = event.target.value.replace(/\D/g, '');
    input = input.substring(0, 4);
    if (input.length > 2) {
        event.target.value = input.substring(0, 2) + '/' + input.substring(2);
    } else {
        event.target.value = input;
    }
}