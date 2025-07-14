// group-buy-frontend/script.js

// BASE_URL common.js'den geliyor
let countdownIntervals = {};

// --- Yardımcı Fonksiyonlar (Değişmedi) ---
function updateProgressBar(campaignElement, current, target) {
    const percent = (current / target) * 100;
    campaignElement.querySelector(".progress").style.width = `${percent}%`;
    campaignElement.querySelector(".current-count").textContent = current;
}

function updateCountdown(campaignElement, endDate) {
    const now = new Date();
    const endTime = new Date(endDate);
    const diff = endTime.getTime() - now.getTime(); // Kalan süre milisaniye cinsinden

    const timeLeftSpan = campaignElement.querySelector(".time-left");
    const buyButton = campaignElement.querySelector(".buy-button");

    if (diff <= 0) {
        timeLeftSpan.innerText = "Süre doldu!";
        if (buyButton) {
            buyButton.disabled = true;
            buyButton.innerText = "Kampanya Süresi Doldu";
        }
        return false; // Sürenin dolduğunu bildir
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timeLeftSpan.innerText =
        `${hours.toString().padStart(2,"0")} sa ${minutes.toString().padStart(2,"0")} dk ${seconds.toString().padStart(2,"0")} sn`;
    return true; // Sürenin devam ettiğini bildir
}


// --- API İstekleri ve Veri Yönetimi ---

async function fetchAndDisplayCampaigns() {
    const activeCampaignsListDiv = document.getElementById('active-campaigns-list');
    const completedCampaignsListDiv = document.getElementById('completed-campaigns-list');

    if (!activeCampaignsListDiv || !completedCampaignsListDiv) return;

    // İlk yüklemede "yükleniyor" mesajlarını göster
    if (activeCampaignsListDiv.children.length === 0 || (activeCampaignsListDiv.children.length === 1 && activeCampaignsListDiv.querySelector('p')?.textContent === 'Aktif kampanyalar yükleniyor...')) {
        activeCampaignsListDiv.innerHTML = '<p>Aktif kampanyalar yükleniyor...</p>';
    }
    if (completedCampaignsListDiv.children.length === 0 || (completedCampaignsListDiv.children.length === 1 && completedCampaignsListDiv.querySelector('p')?.textContent === 'Tamamlanmış kampanyalar yükleniyor...')) {
        completedCampaignsListDiv.innerHTML = '<p>Tamamlanmış kampanyalar yükleniyor...</p>';
    }
    
    // Mevcut kampanyaların ID'lerini toplamak için setler
    const existingActiveCampaignIds = new Set();
    activeCampaignsListDiv.querySelectorAll('.campaign-card').forEach(card => {
        existingActiveCampaignIds.add(card.dataset.campaignId);
    });

    const existingCompletedCampaignIds = new Set();
    completedCampaignsListDiv.querySelectorAll('.campaign-card').forEach(card => {
        existingCompletedCampaignIds.add(card.dataset.campaignId);
    });

    try {
        // Tüm kampanyaları getir (backend'in filter olmadan hepsini döndürdüğünü varsayıyoruz)
        const res = await fetch(`${BASE_URL}/campaigns`);
        const allCampaignsData = await res.json();

        if (!res.ok) {
            showNotification(allCampaignsData.message || 'Kampanyalar yüklenirken hata oluştu.', 'error');
            activeCampaignsListDiv.innerHTML = '<p>Aktif kampanyalar yüklenirken bir hata oluştu.</p>';
            completedCampaignsListDiv.innerHTML = '<p>Tamamlanmış kampanyalar yüklenirken bir hata oluştu.</p>';
            Object.values(countdownIntervals).forEach(clearInterval);
            countdownIntervals = {};
            return;
        }

        const activeCampaigns = allCampaignsData.filter(c => c.status === 'ACTIVE' && new Date(c.endDate) > new Date() && c.currentQuantity < c.targetQuantity);
        const completedCampaigns = allCampaignsData.filter(c => c.status === 'COMPLETED' || new Date(c.endDate) <= new Date() || c.currentQuantity >= c.targetQuantity);

        // --- Aktif Kampanyaları İşle ---
        const newActiveCampaignIds = new Set();
        if (activeCampaigns.length === 0) {
            activeCampaignsListDiv.innerHTML = '<p>Şu anda aktif kampanya bulunmamaktadır.</p>';
        } else {
            // "yükleniyor..." mesajını temizle eğer varsa ve yeni kampanyalar geliyorsa
            if (activeCampaignsListDiv.querySelector('p')?.textContent === 'Aktif kampanyalar yükleniyor...') {
                activeCampaignsListDiv.innerHTML = '';
            }
            activeCampaigns.forEach(campaign => {
                newActiveCampaignIds.add(campaign.id);
                let campaignCard = activeCampaignsListDiv.querySelector(`[data-campaign-id="${campaign.id}"]`);

                if (!campaignCard) {
                    campaignCard = document.createElement('div');
                    campaignCard.classList.add('campaign-card');
                    campaignCard.dataset.campaignId = campaign.id;
                    activeCampaignsListDiv.appendChild(campaignCard);
                }
                updateCampaignCard(campaignCard, campaign, false); // false: tamamlanmış değil
            });
        }
        
        // Eski aktif kampanyaları kaldır (artık aktif olmayanlar veya silinenler)
        existingActiveCampaignIds.forEach(id => {
            if (!newActiveCampaignIds.has(id)) {
                const cardToRemove = activeCampaignsListDiv.querySelector(`[data-campaign-id="${id}"]`);
                if (cardToRemove) {
                    cardToRemove.remove();
                }
                if (countdownIntervals[id]) {
                    clearInterval(countdownIntervals[id]);
                    delete countdownIntervals[id];
                }
            }
        });

        // --- Tamamlanmış Kampanyaları İşle ---
        const newCompletedCampaignIds = new Set();
        if (completedCampaigns.length === 0) {
            completedCampaignsListDiv.innerHTML = '<p>Henüz tamamlanmış kampanya bulunmamaktadır.</p>';
        } else {
             // "yükleniyor..." mesajını temizle eğer varsa ve yeni kampanyalar geliyorsa
             if (completedCampaignsListDiv.querySelector('p')?.textContent === 'Tamamlanmış kampanyalar yükleniyor...') {
                completedCampaignsListDiv.innerHTML = '';
            }
            completedCampaigns.forEach(campaign => {
                newCompletedCampaignIds.add(campaign.id);
                let campaignCard = completedCampaignsListDiv.querySelector(`[data-campaign-id="${campaign.id}"]`);

                if (!campaignCard) {
                    campaignCard = document.createElement('div');
                    campaignCard.classList.add('campaign-card');
                    campaignCard.dataset.campaignId = campaign.id;
                    completedCampaignsListDiv.appendChild(campaignCard);
                }
                updateCampaignCard(campaignCard, campaign, true); // true: tamamlanmış
            });
        }

        // Eski tamamlanmış kampanyaları kaldır
        existingCompletedCampaignIds.forEach(id => {
            if (!newCompletedCampaignIds.has(id)) {
                const cardToRemove = completedCampaignsListDiv.querySelector(`[data-campaign-id="${id}"]`);
                if (cardToRemove) {
                    cardToRemove.remove();
                }
                // Tamamlanmış kampanyaların zaten interval'i olmamalı ama yine de temizleyelim
                if (countdownIntervals[id]) {
                    clearInterval(countdownIntervals[id]);
                    delete countdownIntervals[id];
                }
            }
        });


    } catch (error) {
        console.error('Kampanyalar çekilirken hata:', error);
        showNotification("Kampanyalar yüklenirken sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.", "error");
        activeCampaignsListDiv.innerHTML = '<p>Aktif kampanyalar yüklenirken sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.</p>';
        completedCampaignsListDiv.innerHTML = '<p>Tamamlanmış kampanyalar yüklenirken sunucuya ulaşılamadı. Lütfen sunucu durumunu kontrol edin.</p>';
        Object.values(countdownIntervals).forEach(clearInterval);
        countdownIntervals = {};
    }
}

// Kampanya kartını oluşturan veya güncelleyen yeni bir yardımcı fonksiyon
function updateCampaignCard(campaignCard, campaign, isCompletedSection = false) {
    const progressPercent = (campaign.currentQuantity / campaign.targetQuantity) * 100;
    const isCampaignActuallyCompleted = campaign.status === 'COMPLETED' || campaign.currentQuantity >= campaign.targetQuantity || (campaign.endDate && new Date(campaign.endDate) <= new Date());

    const buttonText = isCampaignActuallyCompleted ? "Kampanya Tamamlandı" : "Satın Al / Katıl";
    const buttonDisabled = isCampaignActuallyCompleted;

    campaignCard.innerHTML = `
        <h2>${campaign.product ? campaign.product.name : 'Ürün Adı Yok'}</h2>
        <img class="product-img" src="${campaign.product ? campaign.product.imageUrl : 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${campaign.product ? campaign.product.name : 'Ürün'}" />
        <p>Hedef Fiyat: <strong>${campaign.campaignPrice.toFixed(2)} TL</strong></p>
        <div class="progress-bar">
            <div class="progress" style="width: ${progressPercent}%;"></div>
        </div>
        <div class="count-info">
            <span class="current-count">${campaign.currentQuantity}</span> / ${campaign.targetQuantity} adet toplandı
        </div>
        <div class="countdown-timer info">
            ${isCampaignActuallyCompleted ? 'Durum: Tamamlandı' : 'Kampanyanın bitmesine kalan süre: <span class="time-left"></span>'}
        </div>
        <button class="buy-button primary-button" data-campaign-id="${campaign.id}" ${buttonDisabled ? 'disabled' : ''}>${buttonText}</button>
        <div class="campaign-info note">
            Katılım sayısı hedefe ulaşmazsa, tüm katılımcılara para iadesi yapılacaktır.
        </div>
    `;

    const buyButtonForCampaign = campaignCard.querySelector('.buy-button');
    const timeLeftSpan = campaignCard.querySelector(".time-left");

    // Sadece aktif bölümde veya henüz tamamlanmamış kampanyalar için geri sayım
    if (!isCompletedSection && !isCampaignActuallyCompleted) {
        if (!countdownIntervals[campaign.id]) {
            const updateStatusForThisCampaign = () => {
                const hasTimeLeft = updateCountdown(campaignCard, campaign.endDate);
                if (!hasTimeLeft) {
                    clearInterval(countdownIntervals[campaign.id]);
                    delete countdownIntervals[campaign.id];
                    // Süre dolduğunda butonu ve metni tekrar güncelle
                    if (buyButtonForCampaign) {
                        buyButtonForCampaign.disabled = true;
                        buyButtonForCampaign.innerText = "Kampanya Süresi Doldu";
                    }
                    if (timeLeftSpan) timeLeftSpan.innerText = "Süre doldu!";
                }
            };
            updateStatusForThisCampaign(); // İlk güncelleme anında yap
            countdownIntervals[campaign.id] = setInterval(updateStatusForThisCampaign, 1000);
        }
    } else {
        // Tamamlanmış bölümde veya tamamlanmış kampanyalar için sayacı durdur
        if (countdownIntervals[campaign.id]) {
            clearInterval(countdownIntervals[campaign.id]);
            delete countdownIntervals[campaign.id];
        }
    }

    // Satın al butonuna olay dinleyici ekle (her zaman yeniden eklenir, önceki kaldırılır)
    if (buyButtonForCampaign) {
        const oldButton = buyButtonForCampaign;
        const newButton = oldButton.cloneNode(true); // Listener'ları temizlemek için klonla
        oldButton.parentNode.replaceChild(newButton, oldButton);

        if (!buttonDisabled) { // Sadece etkinse listener ekle
            newButton.addEventListener('click', (event) => {
                const campaignId = event.target.dataset.campaignId;
                handleBuyButtonClick(campaignId);
            });
        }
    }
}


// Satın al butonuna tıklayınca modal'ı açan fonksiyon (Değişmedi)
function handleBuyButtonClick(campaignId) {
    const token = getUserToken(); // common.js'den geliyor

    if (!token) {
        showNotification("Kampanyaya katılmak için lütfen giriş yapın veya kayıt olun.", "error");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    const purchaseModal = document.getElementById("purchaseModal");
    if (purchaseModal) {
        purchaseModal.dataset.selectedCampaignId = campaignId; // Seçilen kampanya ID'sini modal'a kaydet
        purchaseModal.style.display = "flex"; // Modal'ı görünür yap

        const modalNotificationDiv = document.getElementById('modal-notification');
        if (modalNotificationDiv) {
            modalNotificationDiv.classList.remove('visible', 'success', 'error');
            modalNotificationDiv.style.display = 'none';
        }
    }
}

// Modal kapatma butonuna tıklayınca modal'ı kapat (Değişmedi)
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("purchaseModal").style.display = "none";
});

// Satın alma formunun submit işlemi (Değişmedi)
document.getElementById("purchaseForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.innerHTML = 'İşleniyor... <span class="spinner"></span>';
    submitButton.classList.add('loading');

    const modalNotificationDiv = document.getElementById('modal-notification');
    if (modalNotificationDiv) {
        modalNotificationDiv.classList.remove('visible', 'success', 'error');
        modalNotificationDiv.style.display = 'none';
    }

    const selectedCampaignId = document.getElementById('purchaseModal').dataset.selectedCampaignId;
    if (!selectedCampaignId) {
        showNotification("Bir kampanya seçilmedi. Lütfen sayfayı yenileyip tekrar deneyin.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }

    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const card = document.getElementById('cardNumber').value.trim().replace(/\s/g, '');
    const exp = document.getElementById('expiryDate').value.trim();
    const cvc = document.getElementById('cvcCode').value.trim();

    // Frontend Doğrulamaları
    if (!name || !email || !card || !exp || !cvc) {
        showNotification("Lütfen tüm alanları doldurun.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        showNotification("Lütfen geçerli bir e-posta adresi girin.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }
    if (card.length !== 16 || isNaN(card)) {
        showNotification("Lütfen 16 haneli geçerli bir kart numarası girin.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }
    if (!/^\d{2}\/\d{2}$/.test(exp)) {
        showNotification("Lütfen geçerli bir son kullanma tarihi (AA/YY) girin.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }
    if (cvc.length !== 3 || isNaN(cvc)) {
        showNotification("Lütfen 3 haneli geçerli bir CVC kodu girin.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }

    const token = getUserToken();
    if (!token) {
        showNotification("Giriş yapmadığınız için işlem yapılamadı. Lütfen tekrar giriş yapın.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }

    // Kullanıcının kayıtlı adreslerini çek
    let userAddresses = [];
    try {
        const addressRes = await fetch(`${BASE_URL}/addresses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const addressData = await addressRes.json();
        if (addressRes.ok && addressData.success && addressData.addresses && addressData.addresses.length > 0) {
            userAddresses = addressData.addresses;
        } else {
            showNotification("Sipariş oluşturmak için kayıtlı adresiniz bulunmamaktadır. Lütfen Hesabım sayfasından adres ekleyin.", "error", 'modal-notification');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Katıl ve Öde';
            submitButton.classList.remove('loading');
            return;
        }
    } catch (error) {
        console.error("Adresler çekilirken hata:", error);
        showNotification("Adres bilgileri alınamadı. Lütfen internet bağlantınızı kontrol edin.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }

    // Varsayılan veya ilk adresi seç
    const defaultAddress = userAddresses.find(addr => addr.isDefault) || userAddresses[0];
    if (!defaultAddress) {
        showNotification("Sipariş oluşturmak için bir varsayılan adresiniz olmalı veya adres eklemelisiniz.", "error", 'modal-notification');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
        return;
    }

    // Backend'in `/orders` rotasına gönderilecek payload
    const orderPayload = {
        campaignId: selectedCampaignId, // Tıklanan kampanya ID'si
        orderedQuantity: 1, // Şimdilik sabit 1 adet. Bir input alanı eklenebilir.
        addressId: defaultAddress.id // Kullanıcının seçilen adresi
    };

    try {
        const res = await fetch(`${BASE_URL}/orders`, { // /api/orders rotasına POST isteği
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(orderPayload)
        });

        const result = await res.json();
        if (res.ok && result.success) { // Backend'den gelen yanıtın `success` property'sine göre kontrol
            showNotification("Kampanyaya başarıyla katıldınız!", "success"); // Ana bildirim alanı
            document.getElementById("purchaseModal").style.display = "none";
            form.reset();
            // Satın alma sonrası kampanya verilerini daha hızlı güncellemek için
            fetchAndDisplayCampaigns(); // Kampanyaları tekrar yükle ki sayaçlar güncellensin
        } else {
            showNotification(result.message || "Bir hata oluştu. Lütfen tekrar deneyin.", "error", 'modal-notification');
        }
    } catch (err) {
        console.error("Sipariş oluşturulurken hata:", err);
        showNotification("Sipariş oluşturulurken sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.", "error", 'modal-notification');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Katıl ve Öde';
        submitButton.classList.remove('loading');
    }
});

// --- Sayfa Yükleme ve Başlangıç Ayarları ---
document.addEventListener('DOMContentLoaded', () => {
    // Modalı sayfa yüklendiğinde gizle
    const purchaseModal = document.getElementById("purchaseModal");
    if (purchaseModal) {
        purchaseModal.style.display = "none";
    }

    // Input alanlarına olay dinleyicileri ekle
    document.querySelector('#purchaseForm #cardNumber').addEventListener('input', formatCardNumber);
    document.querySelector('#purchaseForm #expiryDate').addEventListener('input', formatExpiryDate);
    document.querySelector('#purchaseForm #fullName').addEventListener('input', (event) => {
        const filteredValue = event.target.value.replace(/[^a-zA-ZğĞüÜşŞıİöÖçÇ\s-]/g, '');
        event.target.value = filteredValue;
    });

    // Sayfa yüklendiğinde kampanyaları çek ve listele
    fetchAndDisplayCampaigns();

    // Kampanyaları ve sayaçları periyodik olarak güncelle (her 10 saniyede bir)
    setInterval(fetchAndDisplayCampaigns, 10000);
});