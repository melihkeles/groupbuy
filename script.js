// group-buy-frontend/script.js

const TARGET_COUNT = 500;
let currentCount = 0;
let campaignEndTime; // Backend'den gelecek olan kampanya bitiş tarihi

// --- Ortak Yardımcı Fonksiyonlar ---

// Progress bar ve sayaç güncelleme fonksiyonu
function updateProgressBar() {
  const percent = (currentCount / TARGET_COUNT) * 100;
  document.getElementById("progress").style.width = `${percent}%`;
  document.getElementById("current-count").textContent = currentCount;
}

// Geri sayım mantığı
function updateCountdown() {
  // Eğer kampanya bitiş tarihi henüz tanımlanmadıysa (API'den gelmediyse) fonksiyonu çalıştırma
  if (!campaignEndTime) return;

  const now = new Date();
  const diff = campaignEndTime.getTime() - now.getTime(); // Kalan süreyi milisaniye cinsinden hesapla

  const timeLeftSpan = document.getElementById("time-left");
  const buyButton = document.getElementById("buy-button");

  if (diff <= 0) { // Süre dolduysa
    timeLeftSpan.innerText = "Süre doldu!";
    if (buyButton) { // Satın alma butonunu devre dışı bırak
      buyButton.disabled = true;
      buyButton.innerText = "Kampanya Süresi Doldu";
    }
    // Geri sayım bittiğinde interval'ı durdur
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
    return;
  }

  // Kalan süreyi saat, dakika, saniye cinsinden hesapla
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Geri sayımı HTML'e yaz
  timeLeftSpan.innerText =
    `${hours.toString().padStart(2,"0")} sa ${minutes.toString().padStart(2,"0")} dk ${seconds.toString().padStart(2,"0")} sn`;
}


// --- API İstekleri ve Veri Yönetimi ---

// Backend'den katılımcı sayısını ve kampanya bitiş tarihini çeker
async function fetchCurrentCountAndCampaignStatus() {
  try {
    const res = await fetch('http://localhost:3000/api/count');
    const data = await res.json();
    if (data.success) {
      currentCount = data.count;
      updateProgressBar(); // Progress barı güncelle

      // Kampanya bitiş tarihini backend'den al ve Date objesine çevir
      if (data.campaignDeadline) {
          campaignEndTime = new Date(data.campaignDeadline);
          updateCountdown(); // Tarihi aldıktan sonra geri sayımı hemen güncelle
      }

      // Eğer kampanya hedefi dolmuşsa veya süresi dolmuşsa butonları ayarla
      if (currentCount >= TARGET_COUNT) {
        const buyButton = document.getElementById("buy-button");
        if (buyButton) {
            buyButton.disabled = true;
            buyButton.innerText = "Kampanya Tamamlandı";
        }
        document.getElementById("time-left").innerText = "Kampanya Tamamlandı"; // Sayaç yerine mesaj
        if (window.countdownInterval) { // Sayaç interval'ını durdur
            clearInterval(window.countdownInterval);
        }
      }
    } else {
      console.warn('Katılımcı sayısı veya kampanya süresi alınamadı:', data.message || 'Bilinmeyen hata');
    }
  } catch (error) {
    console.error('Veri çekilemedi:', error);
  }
}

// --- Kullanıcı Bildirim Fonksiyonu ---
function showNotification(message, type = 'success') {
  const mainNotificationDiv = document.getElementById('notification'); // Ana sayfa bildirimi
  const modalNotificationDiv = document.getElementById('modal-notification'); // Modal içi bildirim
  const purchaseModal = document.getElementById('purchaseModal');

  let targetNotificationDiv;

  // Eğer modal açıksa, bildirimi modal içinde göster
  // CSS'te display:flex yerine JavaScript ile display:block yapıldığını varsayıyoruz.
  // Daha doğru bir kontrol: computed style almak.
  const modalComputedStyle = window.getComputedStyle(purchaseModal);

  if (modalComputedStyle.display === 'flex') { // Eğer modal görünürse
      targetNotificationDiv = modalNotificationDiv;
  } else {
      targetNotificationDiv = mainNotificationDiv;
  }
  
  if (!targetNotificationDiv) { // Eğer bildirim div'i bulunamazsa konsola yaz
      console.error("Bildirim div'i bulunamadı. ID hatası olabilir.");
      alert(message); // Geri dönüş olarak alert kullan
      return;
  }

  targetNotificationDiv.textContent = message;

  // Önceki sınıfları temizle
  targetNotificationDiv.className = '';
  targetNotificationDiv.classList.add(type); // 'success' veya 'error' sınıfını ekle
  targetNotificationDiv.classList.add('visible'); // Görünür yap

  // Mesajı belli bir süre sonra otomatik gizle
  setTimeout(() => {
    targetNotificationDiv.classList.remove('visible'); // Gizle
    // display: none; geçişten sonra aktif olsun, aksi halde direkt kaybolur
    setTimeout(() => {
        targetNotificationDiv.style.display = 'none';
    }, 400); // CSS transition süresine uygun

  }, 3000); // 3 saniye sonra kaybolur

  targetNotificationDiv.style.display = 'block'; // Mesajı göstermek için display'i ayarla
}

// --- Form Girişlerini Akıllı Hale Getirme ---

// Kart Numarası Formatlama
function formatCardNumber(event) {
    let input = event.target.value.replace(/\D/g, ''); // Sadece rakamları al
    input = input.substring(0, 16); // En fazla 16 hane

    // Her 4 hanede bir boşluk ekle
    let formattedInput = '';
    for (let i = 0; i < input.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedInput += ' ';
        }
        formattedInput += input[i];
    }
    event.target.value = formattedInput;
}

// Son Kullanma Tarihi Formatlama (AA/YY)
function formatExpiryDate(event) {
    let input = event.target.value.replace(/\D/g, ''); // Sadece rakamları al
    input = input.substring(0, 4); // En fazla 4 hane (MMYY)

    if (input.length > 2) {
        // İlk iki haneden sonra '/' ekle
        event.target.value = input.substring(0, 2) + '/' + input.substring(2);
    } else {
        event.target.value = input;
    }
}


// --- Olay Dinleyicileri ve Form İşlemleri ---

// Satın al butonuna tıklayınca modal'ı aç
document.getElementById("buy-button").addEventListener("click", () => {
  const purchaseModal = document.getElementById("purchaseModal");
  if (purchaseModal) { // Modal elementinin varlığını kontrol edelim
    purchaseModal.style.display = "flex";
    // Modal açıldığında varsa önceki hataları temizle
    const modalNotificationDiv = document.getElementById('modal-notification');
    if (modalNotificationDiv) {
      modalNotificationDiv.classList.remove('visible', 'success', 'error');
      modalNotificationDiv.style.display = 'none';
    }
  }
});


// Modal kapatma butonuna tıklayınca modal'ı kapat
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("purchaseModal").style.display = "none";
});

document.getElementById("purchaseForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]'); // Submit butonunu seçtik

  // Butonun yükleme durumunu ayarla
  submitButton.disabled = true;
  submitButton.innerHTML = 'İşleniyor... <span class="spinner"></span>'; // Metni ve spinner'ı ekle
  submitButton.classList.add('loading'); // Yükleme sınıfını ekle

  // Clear any existing modal notifications
  const modalNotificationDiv = document.getElementById('modal-notification');
  modalNotificationDiv.classList.remove('visible', 'success', 'error');
  modalNotificationDiv.style.display = 'none';


  const name = form[0].value.trim();
  const email = form[1].value.trim();
  const card = form[2].value.trim().replace(/\s/g, '');
  const exp = form[3].value.trim();
  const cvc = form[4].value.trim();

  // Frontend Doğrulamaları (Hataları modal içinde gösterir)
  if (!name || !email || !card || !exp || !cvc) {
      showNotification("Lütfen tüm alanları doldurun.", "error");
      // Hata durumunda butonu eski haline getir
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

  const data = { name, email, card, exp, cvc };

  try {
    const res = await fetch("http://localhost:3000/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (result.success) {
      await fetchCurrentCountAndCampaignStatus();
      showNotification("Kampanyaya başarıyla katıldınız!", "success");
      document.getElementById("purchaseModal").style.display = "none";
      form.reset(); // Formu sıfırla
    } else {
      showNotification(result.message || "Bir hata oluştu. Lütfen tekrar deneyin.", "error");
    }
  } catch (err) {
    console.error("Sunucuya ulaşılamadı veya istekte hata oluştu:", err);
    showNotification("Sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.", "error");
  } finally {
    // İşlem tamamlandığında (başarılı veya hatalı), butonu eski haline getir
    submitButton.disabled = false;
    submitButton.innerHTML = 'Katıl ve Öde';
    submitButton.classList.remove('loading');
  }
});

// --- Sayfa Yükleme ve Başlangıç Ayarları ---

// Sayfa ilk yüklendiğinde çalışacak kodlar
document.addEventListener('DOMContentLoaded', () => {
  // Modalı sayfa yüklendiğinde gizle
  const purchaseModal = document.getElementById("purchaseModal");
  if (purchaseModal) {
      purchaseModal.style.display = "none";
  }

  // Input alanlarına olay dinleyicileri ekle
  document.querySelector('input[placeholder="Kart numaranızı girin"]').addEventListener('input', formatCardNumber);
  document.querySelector('input[placeholder="12/25"]').addEventListener('input', formatExpiryDate);
  document.querySelector('input[placeholder="Adınızı ve Soyadınızı girin"]').addEventListener('input', (event) => {
    // Sadece harflere, boşluğa ve tire (-) işaretine izin ver
    // Türkçe karakterleri de desteklemek için Unicode aralığını kullanabiliriz
    const filteredValue = event.target.value.replace(/[^a-zA-ZğĞüÜşŞıİöÖçÇ\s-]/g, '');
    event.target.value = filteredValue;
  });

  // Hem katılımcı sayısını hem de kampanya durumunu ilk yüklemede çek
  fetchCurrentCountAndCampaignStatus();

  // Geri sayımı her saniye güncellemek için interval başlat
  // Bu interval'ı global scope'a atıyoruz ki gerektiğinde durdurabilelim
  window.countdownInterval = setInterval(updateCountdown, 1000);

  // Katılımcı sayısını ve kampanya bitiş tarihini periyodik olarak güncelle (10 saniyede bir)
  // Bu, yeni kayıtların veya kampanya tarihinin güncellenmesi durumunda frontend'i senkron tutar.
  setInterval(fetchCurrentCountAndCampaignStatus, 10000);
});