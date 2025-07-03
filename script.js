const TARGET_COUNT = 500;
let currentCount = 0;  // Backend'den gerçek sayı ile güncellenecek

// Progress bar ve sayaç güncelleme fonksiyonu
function updateProgressBar() {
  const percent = (currentCount / TARGET_COUNT) * 100;
  document.getElementById("progress").style.width = `${percent}%`;
  document.getElementById("current-count").textContent = currentCount;
}

// Backend'den katılımcı sayısını çek
async function fetchCurrentCount() {
  try {
    const res = await fetch('http://localhost:3000/api/count');
    const data = await res.json();
    if (data.success) {
      currentCount = data.count;
      updateProgressBar();
    } else {
      console.warn('Katılımcı sayısı alınamadı.');
    }
  } catch (error) {
    console.error('Katılımcı sayısı çekilemedi:', error);
  }
}

// Sayacı her 10 saniyede bir güncelle
setInterval(() => {
  fetchCurrentCount();
}, 10000); // 10 saniye


// Modal açma/kapatma işlemleri
document.getElementById("buy-button").addEventListener("click", () => {
  document.getElementById("purchaseModal").style.display = "block";
});
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("purchaseModal").style.display = "none";
});

// Form gönderme işlemi, backend'e veri gönderilir
document.getElementById("purchaseForm").addEventListener("submit", async function(e) {
  e.preventDefault();

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
      currentCount++;          // Backend'e başarılı kayıt sonrası sayıyı arttır
      updateProgressBar();
      alert("Kampanyaya başarıyla katıldınız!");
      document.getElementById("purchaseModal").style.display = "none";
      form.reset();
    } else {
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  } catch (err) {
    console.error(err);
    alert("Sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.");
  }
});

// Sayfa yüklendiğinde backend'den güncel sayıyı çek ve geri sayımı başlat
window.onload = () => {
  fetchCurrentCount()
};

document.addEventListener('DOMContentLoaded', () => {
  fetchCurrentCount(); // Sayfa ilk yüklendiğinde çek
});

// Kampanya bitiş tarihi (örnek: 48 saat sonrası için)
const campaignEndTime = new Date("2025-07-05T23:59:59"); // ← burayı istediğin tarihle güncelle

function updateCountdown() {
  const now = new Date();
  const diff = campaignEndTime - now;

  if (diff <= 0) {
    document.getElementById("time-left").innerText = "Süre doldu!";
    document.getElementById("buy-button").disabled = true;
    document.getElementById("buy-button").innerText = "Kampanya Süresi Doldu";
    return;
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  document.getElementById("time-left").innerText =
    `${hours} sa ${minutes} dk ${seconds} sn`;
}

document.addEventListener('DOMContentLoaded', () => {
  // Tüm silme butonlarını seç
  const deleteButtons = document.querySelectorAll('.delete-btn');

  deleteButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
          const orderId = event.target.dataset.orderId; // Butonun data-order-id özelliğinden ID'yi al

          if (!confirm(`Sipariş ID: ${orderId} gerçekten silmek istiyor musunuz?`)) {
              return; // Kullanıcı onaylamazsa işlemi iptal et
          }

          try {
              const response = await fetch(`/api/orders/${orderId}`, {
                  method: 'DELETE' // DELETE metodunu kullan
              });

              const data = await response.json();

              if (data.success) {
                  alert(data.message);
                  // Sipariş başarıyla silindiyse, sayfadan ilgili satırı/elementi kaldır
                  event.target.closest('tr').remove(); // Tablo satırı ise 'tr'yi kaldır
                  // Veya sayfayı yeniden yükle: window.location.reload();
              } else {
                  alert(`Silme başarısız: ${data.message}`);
              }
          } catch (error) {
              console.error("Silme isteği gönderilirken hata oluştu:", error);
              alert("Sipariş silinirken bir hata oluştu.");
          }
      });
  });
});

// Her saniye güncelle
setInterval(updateCountdown, 1000);
updateCountdown(); // İlk yüklemede çalıştır

