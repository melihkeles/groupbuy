// account.js

// BASE_URL, getUserToken, decodeToken, showNotification, logoutUser common.js'den gelir

let allProvincesAndDistricts = []; // tr-il-ilce.json verilerini tutacak

document.addEventListener('DOMContentLoaded', async () => {
    // Navigasyon durumunu kontrol et (common.js'den)
    checkLoginStatus();

    const accountNotificationDiv = document.getElementById('account-notification');
    const modalAddressNotificationDiv = document.getElementById('modal-address-notification');

    const userNameSpan = document.getElementById('user-name');
    const userEmailSpan = document.getElementById('user-email');
    const userRegisteredAtSpan = document.getElementById('user-registered-at');
    const addressesListDiv = document.getElementById('addresses-list');
    const ordersListDiv = document.getElementById('orders-list');

    const addressModal = document.getElementById('addressModal');
    const closeAddressModalButton = document.getElementById('closeAddressModal');
    const addAddressButton = document.getElementById('add-address-button');
    const addressForm = document.getElementById('addressForm');
    const addressModalTitle = document.getElementById('address-modal-title');
    const saveAddressButton = document.getElementById('saveAddressButton');

    // Adres formu inputları
    const addressIdInput = document.getElementById('addressId');
    const addressTitleInput = document.getElementById('addressTitle');
    const addressFullNameInput = document.getElementById('addressFullName');
    const addressPhoneInput = document.getElementById('addressPhone');
    const addressCountryInput = document.getElementById('addressCountry');
    // Şehir ve İlçe select elementleri
    const addressCitySelect = document.getElementById('addressCity'); // Burası değişti!
    const addressDistrictSelect = document.getElementById('addressDistrict'); // Burası değişti!
    const addressNeighborhoodInput = document.getElementById('addressNeighborhood');
    const addressLine1Input = document.getElementById('addressLine1');
    const addressLine2Input = document.getElementById('addressLine2');
    const addressZipCodeInput = document.getElementById('addressZipCode');
    const isDefaultAddressInput = document.getElementById('isDefaultAddress');

    let currentUserId = null;

    // --- Sekme Yönetimi ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    function activateTab(tabName) {
        tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Sekmeler arası geçişte ilgili verileri yükle
        if (tabName === 'profile') {
            fetchUserProfile();
        } else if (tabName === 'addresses') {
            fetchUserAddresses();
        } else if (tabName === 'orders') {
            fetchUserParticipations(); // Siparişler için katılımları kullanıyoruz şimdilik
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            activateTab(button.dataset.tab);
        });
    });

    // --- Kullanıcı Doğrulama ve Bilgi Çekme ---
    async function initializeAccountPage() {
        const token = getUserToken();
        if (!token) {
            showNotification("Hesap bilgilerinizi görmek için lütfen giriş yapın.", "error", 'account-notification');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }

        const decodedToken = decodeToken(token);
        if (!decodedToken || !decodedToken.userId) {
            showNotification("Kullanıcı kimliği alınamadı. Lütfen tekrar giriş yapın.", "error", 'account-notification');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return;
        }
        currentUserId = decodedToken.userId; // userId'yi globalde sakla
        activateTab('profile'); // Sayfa yüklendiğinde varsayılan olarak profil sekmesini aç
    }

    // --- Kullanıcı Profil Bilgilerini Çekme ---
    async function fetchUserProfile() {
        const token = getUserToken();
        if (!token) return;

        try {
            const userRes = await fetch(`${BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();

            if (userRes.ok && userData.success && userData.user) {
                userNameSpan.textContent = userData.user.name || 'N/A';
                userEmailSpan.textContent = userData.user.email;
                userRegisteredAtSpan.textContent = new Date(userData.user.createdAt).toLocaleDateString('tr-TR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
            } else {
                showNotification(userData.message || "Kullanıcı bilgileri yüklenemedi.", "error", 'account-notification');
                userNameSpan.textContent = 'Yüklenemedi';
                userEmailSpan.textContent = 'Yüklenemedi';
                userRegisteredAtSpan.textContent = 'Yüklenemedi';
                if (userRes.status === 401 || userRes.status === 403) {
                    setTimeout(() => { logoutUser(); }, 1500);
                }
            }
        } catch (error) {
            console.error('Kullanıcı bilgileri çekilirken hata:', error);
            showNotification("Kullanıcı bilgileri yüklenirken bir sorun oluştu. Sunucuya ulaşılamadı.", "error", 'account-notification');
            userNameSpan.textContent = 'Hata!';
            userEmailSpan.textContent = 'Hata!';
            userRegisteredAtSpan.textContent = 'Hata!';
        }
    }

    // --- Adres Yönetimi ---

    // İl/ilçe verilerini yükle
    async function loadProvinceAndDistrictData() {
        try {
            const res = await fetch('/data/turkiye-il-ilce.json');
            if (!res.ok) {
                throw new Error('İl/ilçe verileri yüklenemedi.');
            }
            allProvincesAndDistricts = await res.json();

            // İlleri doldur
            addressCitySelect.innerHTML = '<option value="">Şehir Seçiniz</option>';
            allProvincesAndDistricts.forEach(city => {
                const option = document.createElement('option');
                option.value = city.text; // Value olarak ilin metin adını kullan
                option.textContent = city.text;
                addressCitySelect.appendChild(option);
            });
        } catch (error) {
            console.error("İl/İlçe verileri yüklenirken hata:", error);
            showNotification("İl ve ilçe verileri yüklenirken bir sorun oluştu.", "error", 'modal-address-notification');
        }
    }

    // İl seçimi değiştiğinde ilçeleri doldur
    if (addressCitySelect) {
        addressCitySelect.addEventListener('change', () => {
            const selectedCityName = addressCitySelect.value;
            addressDistrictSelect.innerHTML = '<option value="">İlçe Seçiniz</option>'; // İlçeleri temizle
            addressDistrictSelect.disabled = true;

            if (selectedCityName) {
                const selectedCity = allProvincesAndDistricts.find(city => city.text === selectedCityName);
                if (selectedCity && selectedCity.districts.length > 0) {
                    selectedCity.districts.forEach(district => {
                        const option = document.createElement('option');
                        option.value = district.text; // Value olarak ilçenin metin adını kullan
                        option.textContent = district.text;
                        addressDistrictSelect.appendChild(option);
                    });
                    addressDistrictSelect.disabled = false;
                }
            }
        });
    }


    // Adresleri çek ve listele
    async function fetchUserAddresses() {
        const token = getUserToken();
        if (!token) return;

        addressesListDiv.innerHTML = '<p>Adresler yükleniyor...</p>';
        try {
            const res = await fetch(`${BASE_URL}/addresses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success && data.addresses) {
                if (data.addresses.length === 0) {
                    addressesListDiv.innerHTML = '<p>Kayıtlı adresiniz bulunmamaktadır.</p>';
                } else {
                    addressesListDiv.innerHTML = ''; // Önceki içeriği temizle
                    data.addresses.forEach(address => {
                        const addressItem = document.createElement('div');
                        addressItem.classList.add('address-item');
                        if (address.isDefault) {
                            addressItem.classList.add('default-address');
                        }

                        addressItem.innerHTML = `
                            <div class="address-info">
                                <p><strong>Başlık:</strong> ${address.title || 'Belirtilmemiş'} ${address.isDefault ? '<span class="badge">Varsayılan</span>' : ''}</p>
                                <p><strong>Ad Soyad:</strong> ${address.fullName}</p>
                                <p><strong>Telefon:</strong> ${address.phone}</p>
                                <p><strong>Adres:</strong> ${address.addressLine1} ${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.neighborhood ? address.neighborhood + ' Mah., ' : ''}${address.district ? address.district + ' / ' : ''}${address.city}, ${address.country} ${address.zipCode ? ', Posta Kodu: ' + address.zipCode : ''}</p>
                            </div>
                            <div class="address-actions">
                                <button class="button edit-button" data-id="${address.id}">Düzenle</button>
                                <button class="button delete-button" data-id="${address.id}">Sil</button>
                            </div>
                        `;
                        addressesListDiv.appendChild(addressItem);
                    });

                    // Butonlara event listener ekle
                    addressesListDiv.querySelectorAll('.edit-button').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const addressId = e.target.dataset.id;
                            const addressToEdit = data.addresses.find(addr => addr.id === addressId);
                            if (addressToEdit) {
                                openAddressModal(addressToEdit);
                            }
                        });
                    });

                    addressesListDiv.querySelectorAll('.delete-button').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const addressId = e.target.dataset.id;
                            if (confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
                                deleteAddress(addressId);
                            }
                        });
                    });
                }
            } else {
                showNotification(data.message || "Adresler yüklenemedi.", "error", 'account-notification');
                addressesListDiv.innerHTML = '<p>Adresler yüklenirken bir hata oluştu.</p>';
                 if (res.status === 401 || res.status === 403) {
                    setTimeout(() => { logoutUser(); }, 1500);
                }
            }
        } catch (error) {
            console.error('Adresler çekilirken hata:', error);
            showNotification("Adresler yüklenirken sunucuya ulaşılamadı.", "error", 'account-notification');
            addressesListDiv.innerHTML = '<p>Adresler yüklenirken sunucuya ulaşılamadı.</p>';
        }
    }

    // Adres modalını aç
    async function openAddressModal(address = null) {
        addressForm.reset(); // Formu sıfırla
        modalAddressNotificationDiv.style.display = 'none'; // Bildirimi gizle
        modalAddressNotificationDiv.classList.remove('visible', 'success', 'error');

        // İl/ilçe select kutularını varsayılan durumlarına getir
        addressCitySelect.innerHTML = '<option value="">Şehir Seçiniz</option>';
        addressDistrictSelect.innerHTML = '<option value="">İlçe Seçiniz</option>';
        addressDistrictSelect.disabled = true;

        // İl/ilçe verilerini yükle (modal her açıldığında çağırabiliriz veya bir kere yüklenebilir)
        if (allProvincesAndDistricts.length === 0) {
            await loadProvinceAndDistrictData(); // Veri daha önce yüklenmediyse yükle
        } else {
            // Zaten yüklüyse, sadece il seçeneklerini doldur
            allProvincesAndDistricts.forEach(city => {
                const option = document.createElement('option');
                option.value = city.text;
                option.textContent = city.text;
                addressCitySelect.appendChild(option);
            });
        }


        if (address) {
            addressModalTitle.textContent = 'Adresi Düzenle';
            addressIdInput.value = address.id;
            addressTitleInput.value = address.title || '';
            addressFullNameInput.value = address.fullName;
            addressPhoneInput.value = address.phone;
            addressCountryInput.value = address.country;

            // İl ve ilçeyi doldurma
            addressCitySelect.value = address.city;
            // İl seçimi değiştiğinde ilçelerin dolması için change event'ini tetikle
            // Bu, seçilen ilin ilçelerini dolduracak
            addressCitySelect.dispatchEvent(new Event('change'));

            // Ardından ilçe seçimi için küçük bir gecikme kullanmak gerekebilir
            // çünkü ilçeler asenkron olarak yüklenecektir.
            setTimeout(() => {
                addressDistrictSelect.value = address.district || '';
                addressDistrictSelect.disabled = !addressCitySelect.value; // İl seçili değilse ilçe de devre dışı kalsın
            }, 100); // Küçük bir gecikme ile ilçe seçimini ayarla

            addressNeighborhoodInput.value = address.neighborhood || '';
            addressLine1Input.value = address.addressLine1;
            addressLine2Input.value = address.addressLine2 || '';
            addressZipCodeInput.value = address.zipCode || '';
            isDefaultAddressInput.checked = address.isDefault;
        } else {
            addressModalTitle.textContent = 'Yeni Adres Ekle';
            addressIdInput.value = ''; // Yeni adres için ID boş
            isDefaultAddressInput.checked = false;
        }
        addressModal.style.display = 'flex';
    }

    // Adres modalını kapat
    closeAddressModalButton.addEventListener('click', () => {
        addressModal.style.display = 'none';
    });

    // "Yeni Adres Ekle" butonuna tıklandığında modalı aç
    addAddressButton.addEventListener('click', () => {
        openAddressModal();
    });

    // Adres formunu submit etme
    addressForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        saveAddressButton.disabled = true;
        saveAddressButton.innerHTML = 'Kaydediliyor... <span class="spinner"></span>';
        saveAddressButton.classList.add('loading');
        modalAddressNotificationDiv.style.display = 'none';

        const id = addressIdInput.value;
        const addressData = {
            title: addressTitleInput.value.trim() || null,
            fullName: addressFullNameInput.value.trim(),
            phone: addressPhoneInput.value.trim(),
            country: addressCountryInput.value.trim(),
            // Burada select kutularından metin değerlerini alıyoruz
            city: addressCitySelect.value.trim(),
            district: addressDistrictSelect.value.trim() || null,
            neighborhood: addressNeighborhoodInput.value.trim() || null,
            addressLine1: addressLine1Input.value.trim(),
            addressLine2: addressLine2Input.value.trim() || null,
            zipCode: addressZipCodeInput.value.trim() || null,
            isDefault: isDefaultAddressInput.checked
        };

        // Form doğrulama
        if (!addressData.fullName || !addressData.phone || !addressData.country || !addressData.city || !addressData.district || !addressData.addressLine1) {
            showNotification("Lütfen * ile işaretlenmiş tüm zorunlu alanları doldurun.", "error", 'modal-address-notification');
            saveAddressButton.disabled = false;
            saveAddressButton.innerHTML = 'Adresi Kaydet';
            saveAddressButton.classList.remove('loading');
            return;
        }

        const token = getUserToken();
        if (!token) {
            showNotification("Giriş yapmadığınız için işlem yapılamadı. Lütfen tekrar giriş yapın.", "error", 'modal-address-notification');
            saveAddressButton.disabled = false;
            saveAddressButton.innerHTML = 'Adresi Kaydet';
            saveAddressButton.classList.remove('loading');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            return;
        }

        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${BASE_URL}/addresses/${id}` : `${BASE_URL}/addresses`;

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addressData)
            });

            const result = await res.json();
            if (result.success) {
                showNotification(result.message, "success", 'account-notification'); // Genel bildirim
                addressModal.style.display = 'none'; // Modalı kapat
                fetchUserAddresses(); // Adresleri yeniden yükle
            } else {
                showNotification(result.message || "Bir hata oluştu. Lütfen tekrar deneyin.", "error", 'modal-address-notification');
            }
        } catch (error) {
            console.error('Adres kaydedilirken hata:', error);
            showNotification("Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.", "error", 'modal-address-notification');
        } finally {
            saveAddressButton.disabled = false;
            saveAddressButton.innerHTML = 'Adresi Kaydet';
            saveAddressButton.classList.remove('loading');
        }
    });

    // Adres silme fonksiyonu
    async function deleteAddress(addressId) {
        const token = getUserToken();
        if (!token) {
            showNotification("Giriş yapmadığınız için işlem yapılamadı. Lütfen tekrar giriş yapın.", "error", 'account-notification');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/addresses/${addressId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();

            if (result.success) {
                showNotification(result.message, "success", 'account-notification');
                fetchUserAddresses(); // Adresleri yeniden yükle
            } else {
                showNotification(result.message || "Adres silinirken bir hata oluştu.", "error", 'account-notification');
            }
        } catch (error) {
            console.error('Adres silinirken hata:', error);
            showNotification("Adres silinirken sunucuya ulaşılamadı.", "error", 'account-notification');
        }
    }

    // --- Sipariş Geçmişi (Katılımlar) ---
    async function fetchUserParticipations() {
        const token = getUserToken();
        if (!token) return;

        ordersListDiv.innerHTML = '<p>Siparişler yükleniyor...</p>';
        try {
            const participationsRes = await fetch(`${BASE_URL}/orders/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const participationsData = await participationsRes.json();

            if (participationsRes.ok && participationsData.success && participationsData.participations) {
                if (participationsData.participations.length === 0) {
                    ordersListDiv.innerHTML = '<p>Henüz katıldığınız bir kampanya/sipariş bulunmamaktadır.</p>';
                } else {
                    ordersListDiv.innerHTML = '';
                    participationsData.participations.forEach(p => {
                        const participationItem = document.createElement('div');
                        participationItem.classList.add('participation-item');
                        participationItem.innerHTML = `
                            <p><strong>Sipariş Kodu:</strong> ${p.id.substring(0,8)}...</p>
                            <p><strong>Kampanya Adı:</strong> ${p.campaign?.product?.name || 'Bilinmiyor'}</p>
                            <p><strong>Katılım Tarihi:</strong> ${new Date(p.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            <p><strong>E-posta:</strong> ${p.email}</p>
                            <p><strong>Durum:</strong> ${p.status}</p>
                        `;
                        ordersListDiv.appendChild(participationItem);
                    });
                }
            } else {
                showNotification(participationsData.message || "Siparişler yüklenemedi.", "error", 'account-notification');
                ordersListDiv.innerHTML = '<p>Siparişler yüklenirken bir hata oluştu.</p>';
                if (participationsRes.status === 401 || participationsRes.status === 403) {
                    setTimeout(() => { logoutUser(); }, 1500);
                }
            }
        } catch (error) {
            console.error('Siparişler çekilirken hata:', error);
            showNotification("Siparişler yüklenirken sunucuya ulaşılamadı.", "error", 'account-notification');
            ordersListDiv.innerHTML = '<p>Siparişler yüklenirken sunucuya ulaşılamadı.</p>';
        }
    }

    // Sayfa yüklendiğinde başlat
    initializeAccountPage();
    loadProvinceAndDistrictData(); // İl/ilçe verilerini baştan yükle

    // Opsiyonel: Telefon numarası formatlama
    addressPhoneInput.addEventListener('input', (e) => {
        let input = e.target.value.replace(/\D/g, ''); // Sadece rakamları al
        if (input.length > 10) { // Türk telefon numarası standardı 10 hane (başında 0 olmadan)
            input = input.substring(0, 10);
        }
        // Örn: 5xx xxx xx xx formatı için
        let formatted = '';
        if (input.length > 0) formatted += input.substring(0, 3);
        if (input.length > 3) formatted += ' ' + input.substring(3, 6);
        if (input.length > 6) formatted += ' ' + input.substring(6, 8);
        if (input.length > 8) formatted += ' ' + input.substring(8, 10);
        e.target.value = formatted;
    });

    // Opsiyonel: Ad Soyad sadece harf ve boşluk
    addressFullNameInput.addEventListener('input', (event) => {
      const filteredValue = event.target.value.replace(/[^a-zA-ZğĞüÜşŞıİöÖçÇ\s-]/g, '');
      event.target.value = filteredValue;
    });
});