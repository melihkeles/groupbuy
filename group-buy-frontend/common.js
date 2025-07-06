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

// Navigasyon için checkLoginStatus
function checkLoginStatus() {
const token = getUserToken();
const welcomeMessage = document.getElementById('welcome-message'); // Zaten HTML'de var olanı seçiyoruz
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const logoutButton = document.getElementById('logout-button');
const profileButton = document.getElementById('profile-button');
const adminButton = document.getElementById('admin-button');

if (token) {
try {
const payload = JSON.parse(atob(token.split('.')[1]));
if (welcomeMessage) { // Welcome mesajı elementi varsa güncelleyin
welcomeMessage.textContent = `Hoş geldiniz, ${payload.name}!`;
}

// Butonların display ayarlarını yapın
if (loginButton) loginButton.style.display = 'none';
if (registerButton) registerButton.style.display = 'none';
if (logoutButton) logoutButton.style.display = 'inline-block';
if (profileButton) profileButton.style.display = 'inline-block';

// Admin butonu görünürlüğünü rol'e göre ayarla (Yeni Eklenen Kısım)
if (adminButton) {
if (payload.role && payload.role === 'ADMIN') { // payload.role kontrolü ekle
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
// Kullanıcı giriş yapmamışsa bu kısım çalışır (ESKİ HALİ GİBİ KALACAK)
if (welcomeMessage) {
welcomeMessage.textContent = '';
}

// Butonların display ayarlarını yapın
if (loginButton) loginButton.style.display = 'inline-block';
if (registerButton) registerButton.style.display = 'inline-block';
if (logoutButton) logoutButton.style.display = 'none';
if (profileButton) profileButton.style.display = 'none';
if (adminButton) adminButton.style.display = 'none'; // Admin butonu da gizli olmalı
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
const profileButton = document.getElementById('profile-button');
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
if (profileButton) {
profileButton.addEventListener('click', () => { window.location.href = 'profile.html'; });
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
return;
}
notificationDiv.textContent = message;
notificationDiv.className = `notification ${type} visible`;
notificationDiv.style.display = 'block'; // Ensure it's visible if hidden by CSS initially

setTimeout(() => {
notificationDiv.classList.remove('visible');
setTimeout(() => { notificationDiv.style.display = 'none'; }, 400); // After transition hide
}, 3000);
}