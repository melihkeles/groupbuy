// group-buy-frontend/script.js

// BASE_URL common.js'den geliyor, burada tekrar tanımlamaya gerek yok.
// const BASE_URL = 'http://localhost:5001/api'; // Kaldırıldı

const TARGET_COUNT = 500;
let currentCount = 0;
let campaignEndTime;

// --- Kullanıcı Bilgisi ve Token Yönetimi ---
// Bu fonksiyonlar common.js'e taşındı. Burada tekrar tanımlanmayacak.
// function getUserToken() { ... }
// function removeUserToken() { ... }
// function decodeToken(token) { ... }
// function updateNavigation() { ... }

// --- Ortak Yardımcı Fonksiyonlar ---

// Progress bar ve sayaç güncelleme fonksiyonu (Aynı kaldı, çünkü bu kampanya sayfasına özel)
function updateProgressBar() {
  const percent = (currentCount / TARGET_COUNT) * 100;
  document.getElementById("progress").style.width = `${percent}%`;
  document.getElementById("current-count").textContent = currentCount;
}

// Geri sayım mantığı (Aynı kaldı, kampanya sayfasına özel)
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
    const res = await fetch(`${BASE_URL}/count`); // BASE_URL common.js'den kullanılacak
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
    // showNotification fonksiyonu common.js'den geldiği için global olarak erişilebilir olmalı.
    if (typeof showNotification === 'function') {
        showNotification("Kampanya bilgileri yüklenirken hata oluştu. Sunucuya ulaşılamadı mı?", "error");
    } else {
        alert("Kampanya bilgileri yüklenirken hata oluştu. Sunucuya ulaşılamadı mı?");
    }
  }
}

// --- Kullanıcı Bildirim Fonksiyonu ---
// showNotification fonksiyonu common.js'e taşındı. Burada tekrar tanımlanmayacak.
// function showNotification(message, type = 'success') { ... }

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
    // getUserToken common.js'den gelecek
    const token = getUserToken(); // `getUserToken()` common.js'den geliyor

    if (!token) {
        // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir
        if (typeof showNotification === 'function') {
            showNotification("Kampanyaya katılmak için lütfen giriş yapın veya kayıt olun.", "error");
        } else {
            alert("Kampanyaya katılmak için lütfen giriş yapın veya kayıt olun.");
        }
        setTimeout(() => {
            window.location.href = 'login.html'; // Yönlendirme
        }, 1500);
        return;
    }

    // Kullanıcı giriş yapmışsa modalı aç
    const purchaseModal = document.getElementById("purchaseModal");
    if (purchaseModal) {
        purchaseModal.style.display = "flex"; // Modal'ı görünür yap
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

// Satın alma formunun submit işlemi
document.getElementById("purchaseForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  submitButton.innerHTML = 'İşleniyor... <span class="spinner"></span>';
  submitButton.classList.add('loading');

  const modalNotificationDiv = document.getElementById('modal-notification');
  if (modalNotificationDiv) { // modalNotificationDiv'in varlığını kontrol et
      modalNotificationDiv.classList.remove('visible', 'success', 'error');
      modalNotificationDiv.style.display = 'none';
  }

  const name = document.getElementById('fullName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const card = document.getElementById('cardNumber').value.trim().replace(/\s/g, '');
  const exp = document.getElementById('expiryDate').value.trim();
  const cvc = document.getElementById('cvcCode').value.trim();

  // Frontend Doğrulamaları (Aynı kaldı)
  if (!name || !email || !card || !exp || !cvc) {
      if (typeof showNotification === 'function') {
          showNotification("Lütfen tüm alanları doldurun.", "error", 'modal-notification'); // modal'a özel bildirim
      } else {
          alert("Lütfen tüm alanları doldurun.");
      }
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
      if (typeof showNotification === 'function') {
          showNotification("Lütfen geçerli bir e-posta adresi girin.", "error", 'modal-notification');
      } else {
          alert("Lütfen geçerli bir e-posta adresi girin.");
      }
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (card.length !== 16 || isNaN(card)) {
      if (typeof showNotification === 'function') {
          showNotification("Lütfen 16 haneli geçerli bir kart numarası girin.", "error", 'modal-notification');
      } else {
          alert("Lütfen 16 haneli geçerli bir kart numarası girin.");
      }
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (!/^\d{2}\/\d{2}$/.test(exp)) {
      if (typeof showNotification === 'function') {
          showNotification("Lütfen geçerli bir son kullanma tarihi (AA/YY) girin.", "error", 'modal-notification');
      } else {
          alert("Lütfen geçerli bir son kullanma tarihi (AA/YY) girin.");
      }
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }
  if (cvc.length !== 3 || isNaN(cvc)) {
      if (typeof showNotification === 'function') {
          showNotification("Lütfen 3 haneli geçerli bir CVC kodu girin.", "error", 'modal-notification');
      } else {
          alert("Lütfen 3 haneli geçerli bir CVC kodu girin.");
      }
      submitButton.disabled = false;
      submitButton.innerHTML = 'Katıl ve Öde';
      submitButton.classList.remove('loading');
      return;
  }

  // Token'ı Authorization header'ına ekle
  // getUserToken common.js'den gelecek
  const token = getUserToken();
  if (!token) {
    if (typeof showNotification === 'function') {
        showNotification("Giriş yapmadığınız için işlem yapılamadı. Lütfen tekrar giriş yapın.", "error", 'modal-notification');
    } else {
        alert("Giriş yapmadığınız için işlem yapılamadı. Lütfen tekrar giriş yapın.");
    }
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
    const res = await fetch(`${BASE_URL}/join`, { // BASE_URL common.js'den kullanılacak
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
      if (typeof showNotification === 'function') {
          showNotification("Kampanyaya başarıyla katıldınız!", "success"); // Ana bildirim alanı
      } else {
          alert("Kampanyaya başarıyla katıldınız!");
      }
      document.getElementById("purchaseModal").style.display = "none";
      form.reset();
    } else {
      if (typeof showNotification === 'function') {
          showNotification(result.message || "Bir hata oluştu. Lütfen tekrar deneyin.", "error", 'modal-notification');
      } else {
          alert(result.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
      }
    }
  } catch (err) {
    console.error("Sunucuya ulaşılamadı veya istekte hata oluştu:", err);
    if (typeof showNotification === 'function') {
        showNotification("Sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.", "error", 'modal-notification');
    } else {
        alert("Sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.");
    }
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
    // Sadece harflere, boşluklara ve tire işaretine izin ver
    const filteredValue = event.target.value.replace(/[^a-zA-ZğĞüÜşŞıİöÖçÇ\s-]/g, '');
    event.target.value = filteredValue;
  });

  // Navigasyon butonları için olay dinleyicileri common.js'e taşındı.
  // Burada kalmış olanları kaldırıyoruz.
  // document.getElementById('login-button').addEventListener('click', () => { ... });
  // document.getElementById('register-button').addEventListener('click', () => { ... });
  // document.getElementById('logout-button').addEventListener('click', () => { ... });

  // Hem katılımcı sayısını hem de kampanya durumunu ilk yüklemede çek
  fetchCurrentCountAndCampaignStatus();

  // Geri sayımı her saniye güncellemek için interval başlat
  window.countdownInterval = setInterval(updateCountdown, 1000);

  // Katılımcı sayısını ve kampanya bitiş tarihini periyodik olarak güncelle (10 saniyede bir)
  setInterval(fetchCurrentCountAndCampaignStatus, 10000);

  // Sayfa yüklendiğinde navigasyonu güncelle - common.js'de çağrılıyor.
  // updateNavigation(); // Bu da common.js'deki checkLoginStatus tarafından halledilecek.
});