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

// --- Olay Dinleyicileri ve Form İşlemleri ---

// Satın al butonuna tıklayınca modal'ı aç
document.getElementById("buy-button").addEventListener("click", () => {
  document.getElementById("purchaseModal").style.display = "flex"; // flex olarak ayarlandı
});

// Modal kapatma butonuna tıklayınca modal'ı kapat
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("purchaseModal").style.display = "none";
});

// Satın alma formunu gönderince
document.getElementById("purchaseForm").addEventListener("submit", async function(e) {
  e.preventDefault(); // Formun varsayılan submit davranışını engelle

  const form = e.target;
  const data = {
    name: form[0].value.trim(),
    email: form[1].value.trim(),
    card: form[2].value.trim(),
    exp: form[3].value.trim(),
    cvc: form[4].value.trim()
  };

  try {
    const res = await fetch("http://localhost:3000/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (result.success) {
      // Başarılı kayıt sonrası güncel bilgileri backend'den tekrar çek
      await fetchCurrentCountAndCampaignStatus(); 
      alert("Kampanyaya başarıyla katıldınız!");
      document.getElementById("purchaseModal").style.display = "none";
      form.reset(); // Formu sıfırla
    } else {
      alert(result.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  } catch (err) {
    console.error("Sunucuya ulaşılamadı veya istekte hata oluştu:", err);
    alert("Sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.");
  }
});


// --- Sayfa Yükleme ve Başlangıç Ayarları ---

// Sayfa ilk yüklendiğinde çalışacak kodlar
document.addEventListener('DOMContentLoaded', () => {
  // Hem katılımcı sayısını hem de kampanya durumunu ilk yüklemede çek
  fetchCurrentCountAndCampaignStatus(); 
  
  // Geri sayımı her saniye güncellemek için interval başlat
  // Bu interval'ı global scope'a atıyoruz ki gerektiğinde durdurabilelim
  window.countdownInterval = setInterval(updateCountdown, 1000); 

  // Katılımcı sayısını ve kampanya bitiş tarihini periyodik olarak güncelle (10 saniyede bir)
  // Bu, yeni kayıtların veya kampanya tarihinin güncellenmesi durumunda frontend'i senkron tutar.
  setInterval(fetchCurrentCountAndCampaignStatus, 10000); 
});