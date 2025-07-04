// group-buy-frontend/script.js
const BASE_URL = 'http://localhost:5001/api';

const TARGET_COUNT = 500;
let currentCount = 0;
let campaignEndTime;

// --- Kullanıcı Bilgisi ve Token Yönetimi ---
function getUserToken() {
    return localStorage.getItem('userToken');
}

function removeUserToken() {
    localStorage.removeItem('userToken');
}

// Token'dan kullanıcı adını/e-postasını çözmek için (sadece görüntüleme amaçlı)
function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Token çözme hatası:", e);
        return null;
    }
}

// Navigasyon butonlarını ve karşılama mesajını güncelleme
function updateNavigation() {
    const token = getUserToken();
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const logoutButton = document.getElementById('logout-button');
    const welcomeMessage = document.getElementById('welcome-message');

    if (token) {
        // Kullanıcı giriş yapmış
        const decoded = decodeToken(token);
        if (decoded && decoded.userEmail) { // Veya decoded.userName, eğer token'a ekliyorsanız
            welcomeMessage.textContent = `Hoş geldiniz, ${decoded.userEmail}!`;
        } else {
            welcomeMessage.textContent = `Hoş geldiniz!`;
        }
        loginButton.style.display = 'none';
        registerButton.style.display = 'none';
        logoutButton.style.display = 'inline-block';
    } else {
        // Kullanıcı giriş yapmamış
        welcomeMessage.textContent = '';
        loginButton.style.display = 'inline-block';
        registerButton.style.display = 'inline-block';
        logoutButton.style.display = 'none';
    }
}

// --- Ortak Yardımcı Fonksiyonlar ---

// Progress bar ve sayaç güncelleme fonksiyonu (Aynı kaldı)
function updateProgressBar() {
  const percent = (currentCount / TARGET_COUNT) * 100;
  document.getElementById("progress").style.width = `${percent}%`;
  document.getElementById("current-count").textContent = currentCount;
}

// Geri sayım mantığı (Aynı kaldı)
function updateCountdown() {
  if (!campaignEndTime) return;

  const now = new Date();
  const diff = campaignEndTime.getTime() - now.getTime();

  const timeLeftSpan = document.getElementById("time-left");
  const buyButton = document.getElementById("buy-button");

  if (diff <= 0) {
    timeLeftSpan.innerText = "Süre doldu!";
    if (buyButton) {
      buyButton.disabled = true;
      buyButton.innerText = "Kampanya Süresi Doldu";
    }
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
    return;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  timeLeftSpan.innerText =
    `${hours.toString().padStart(2,"0")} sa ${minutes.toString().padStart(2,"0")} dk ${seconds.toString().padStart(2,"0")} sn`;
}


// --- API İstekleri ve Veri Yönetimi ---

// Backend'den katılımcı sayısını ve kampanya bitiş tarihini çeker (Aynı kaldı)
async function fetchCurrentCountAndCampaignStatus() {
  try {
    const res = await fetch(`${BASE_URL}/count`);
    const data = await res.json();
    if (data.success) {
      currentCount = data.count;
      updateProgressBar();

      if (data.campaignDeadline) {
          campaignEndTime = new Date(data.campaignDeadline);
          updateCountdown();
      }

      if (currentCount >= TARGET_COUNT) {
        const buyButton = document.getElementById("buy-button");
        if (buyButton) {
            buyButton.disabled = true;
            buyButton.innerText = "Kampanya Tamamlandı";
        }
        document.getElementById("time-left").innerText = "Kampanya Tamamlandı";
        if (window.countdownInterval) {
            clearInterval(window.countdownInterval);
        }
      }
    } else {
      console.warn('Katılımcı sayısı veya kampanya süresi alınamadı:', data.message || 'Bilinmeyen hata');
    }
  } catch (error) {
    console.error('Veri çekilemedi:', error);
    showNotification("Kampanya bilgileri yüklenirken hata oluştu. Sunucuya ulaşılamadı mı?", "error");
  }
}

// --- Kullanıcı Bildirim Fonksiyonu --- (Aynı kaldı)
function showNotification(message, type = 'success') {
  const mainNotificationDiv = document.getElementById('notification');
  const modalNotificationDiv = document.getElementById('modal-notification');
  const purchaseModal = document.getElementById('purchaseModal');

  let targetNotificationDiv;
  const modalComputedStyle = window.getComputedStyle(purchaseModal);

  if (modalComputedStyle.display === 'flex') {
      targetNotificationDiv = modalNotificationDiv;
  } else {
      targetNotificationDiv = mainNotificationDiv;
  }
  
  if (!targetNotificationDiv) {
      console.error("Bildirim div'i bulunamadı. ID hatası olabilir.");
      alert(message);
      return;
  }

  targetNotificationDiv.textContent = message;
  targetNotificationDiv.className = '';
  targetNotificationDiv.classList.add(type);
  targetNotificationDiv.classList.add('visible');

  setTimeout(() => {
    targetNotificationDiv.classList.remove('visible');
    setTimeout(() => {
        targetNotificationDiv.style.display = 'none';
    }, 400);

  }, 3000);
  targetNotificationDiv.style.display = 'block';
}

// --- Form Girişlerini Akıllı Hale Getirme --- (Aynı kaldı)
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


// --- Olay Dinleyicileri ve Form İşlemleri ---

// Satın al butonuna tıklayınca modal'ı aç
document.getElementById("buy-button").addEventListener("click", () => {
    const token = getUserToken();
    if (!token) {
        // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir
        showNotification("Kampanyaya katılmak için lütfen giriş yapın veya kayıt olun.", "error");
        setTimeout(() => {
            window.location.href = 'login.html'; // Yönlendirme
        }, 1500);
        return;
    }

    // Kullanıcı giriş yapmışsa modalı aç
    const purchaseModal = document.getElementById("purchaseModal");
    if (purchaseModal) {
        purchaseModal.style.display = "flex";
        const modalNotificationDiv = document.getElementById('modal-notification');
        if (modalNotificationDiv) {
            modalNotificationDiv.classList.remove('visible', 'success', 'error');
            modalNotificationDiv.style.display = 'none';
        }
    }
});


// Modal kapatma butonuna tıklayınca modal'ı kapat (Aynı kaldı)
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("purchaseModal").style.display = "none";
});

// Satın alma formunun submit işlemi (Token'ı Authorization Header'ına ekleyeceğiz)
document.getElementById("purchaseForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  submitButton.innerHTML = 'İşleniyor... <span class="spinner"></span>';
  submitButton.classList.add('loading');

  const modalNotificationDiv = document.getElementById('modal-notification');
  modalNotificationDiv.classList.remove('visible', 'success', 'error');
  modalNotificationDiv.style.display = 'none';

  const name = form[0].value.trim();
  const email = form[1].value.trim();
  const card = form[2].value.trim().replace(/\s/g, '');
  const exp = form[3].value.trim();
  const cvc = form[4].value.trim();

  // Frontend Doğrulamaları (Aynı kaldı)
  if (!name || !email || !card || !exp || !cvc) {
      showNotification("Lütfen tüm alanları doldurun.", "error");
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
      showNotification("Lütfen geçerli bir e-posta adresi girin.", "error");
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (card.length !== 16 || isNaN(card)) {
      showNotification("Lütfen 16 haneli geçerli bir kart numarası girin.", "error");
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (!/^\d{2}\/\d{2}$/.test(exp)) {
      showNotification("Lütfen geçerli bir son kullanma tarihi (AA/YY) girin.", "error");
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (cvc.length !== 3 || isNaN(cvc)) {
      showNotification("Lütfen 3 haneli geçerli bir CVC kodu girin.", "error");
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }

  // Token'ı Authorization header'ına ekle
  const token = getUserToken();
  if (!token) {
    showNotification("Giriş yapmadığınız için işlem yapılamadı. Lütfen tekrar giriş yapın.", "error");
    submitButton.disabled = false;
    submitButton.innerHTML = 'Katıl ve Öde';
    submitButton.classList.remove('loading');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
    return;
  }

  const data = { name, email, card, exp, cvc };

  try {
    const res = await fetch(`${BASE_URL}/join`, {
      method: "POST",
      headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // TOKEN BURAYA EKLENDİ!
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (result.success) {
      await fetchCurrentCountAndCampaignStatus();
      showNotification("Kampanyaya başarıyla katıldınız!", "success");
      document.getElementById("purchaseModal").style.display = "none";
      form.reset();
    } else {
      showNotification(result.message || "Bir hata oluştu. Lütfen tekrar deneyin.", "error");
    }
  } catch (err) {
    console.error("Sunucuya ulaşılamadı veya istekte hata oluştu:", err);
    showNotification("Sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Katıl ve Öde';
    submitButton.classList.remove('loading');
  }
});

// --- Sayfa Yükleme ve Başlangıç Ayarları --- (Güncellendi)
document.addEventListener('DOMContentLoaded', () => {
  // Modalı sayfa yüklendiğinde gizle
  const purchaseModal = document.getElementById("purchaseModal");
  if (purchaseModal) {
      purchaseModal.style.display = "none";
  }

  // Input alanlarına olay dinleyicileri ekle (Aynı kaldı)
  document.querySelector('input[placeholder="Kart numaranızı girin"]').addEventListener('input', formatCardNumber);
  document.querySelector('input[placeholder="12/25"]').addEventListener('input', formatExpiryDate);
  document.querySelector('input[placeholder="Adınızı ve Soyadınızı girin"]').addEventListener('input', (event) => {
    const filteredValue = event.target.value.replace(/[^a-zA-ZğĞüÜşŞıİöÖçÇ\s-]/g, '');
    event.target.value = filteredValue;
  });

  // Navigasyon butonları için olay dinleyicileri
  document.getElementById('login-button').addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  document.getElementById('register-button').addEventListener('click', () => {
    window.location.href = 'register.html';
  });

  document.getElementById('logout-button').addEventListener('click', () => {
    removeUserToken(); // Token'ı sil
    updateNavigation(); // Navigasyonu güncelle (Giriş Yap/Kayıt Ol görünür)
    showNotification("Başarıyla çıkış yaptınız.", "success");
    // İsteğe bağlı: kullanıcının giriş gerektiren bir sayfadan atılmasını sağlayabilirsiniz
    // window.location.href = 'index.html'; // Veya başka bir sayfaya yönlendirin
  });

  // Hem katılımcı sayısını hem de kampanya durumunu ilk yüklemede çek
  fetchCurrentCountAndCampaignStatus();

  // Geri sayımı her saniye güncellemek için interval başlat
  window.countdownInterval = setInterval(updateCountdown, 1000);

  // Katılımcı sayısını ve kampanya bitiş tarihini periyodik olarak güncelle (10 saniyede bir)
  setInterval(fetchCurrentCountAndCampaignStatus, 10000);

  // Sayfa yüklendiğinde navigasyonu güncelle
  updateNavigation();
});