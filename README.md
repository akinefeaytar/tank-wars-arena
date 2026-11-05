# 🎮 TANK WARS ARENA

2D, çok oyunculu (multiplayer), akıllı yapay zeka (bot) destekli, mermi sektirmeli ve lig/sıralama (ELO) sistemli rekabetçi web tank savaşı oyunu!

---

## ⚡ Özellikler

- 🌐 **Online Çok Oyunculu (Multiplayer):** Arkadaşlarınızla gerçek zamanlı (30-60 FPS) düşük gecikmeli Socket.IO tabanlı savaş.
- 🤖 **Akıllı Yapay Zeka (Botlar):** 
  - Yalnız oynarken veya arkadaşlarını beklerken otomatik olarak oyuna dahil olan akıllı botlar.
  - Tahmini nişan alma (lead targeting), mermilerden kaçınma (dodge) ve canı azaldığında tamir kiti arama davranışları.
  - Farklı bot karakterleri: *Avcı, Keskin Nişancı, Taktikçi, Dengeli*.
- 🏆 **Rekabetçi Sıralama & ELO Sistemi:**
  - 🥉 Bronz ➔ 🥈 Gümüş ➔ 🥇 Altın ➔ 💎 Platin ➔ 🔮 Elmas ➔ 👑 Apex Tanker
  - Her leş, maç zaferi ve seri ile artan ELO puanı.
  - Kalıcı Lider Tablosu (Global Top 50, K/D oranı, Zafer Yüzdesi, Seri rekorları).
- 🔗 **Tek Tıkla Arkadaş Daveti:**
  - Özel oda kurup tek tıkla bağlantı kopyalama (`/?room=ODA_KODU`).
  - Arkadaşların odaya katıldıkça botlar otomatik olarak yerlerini oyunculara devreder.
- 💥 **Taktiksel Oynanış & Fizik:**
  - **Mermi Sektirme (Ricochet):** Çelik duvarlardan seken mermilerle köşe arkasındaki rakipleri avlayın.
  - **Kırılabilir Tuğlalar:** Duvarları havaya uçurup yeni koridorlar açın ve içinden çıkan güçlendirmeleri toplayın.
  - **Gizlenme Çalıları:** Çalıların arasına saklanıp pusu kurun.
  - **Güçlendirmeler:** 
    - 🔥 *Üçlü Namlu (Triple Shot)*
    - ⚡ *Ağır Sniper / Raygun (Yüksek hasar & delici)*
    - 🚀 *Güdümlü Roket (Alan hasarlı patlama)*
    - 🛡️ *Enerji Kalkanı*
    - ❤️ *Tamir Kiti*
    - 💨 *Nitro Hız Artışı*
- 🔊 **Web Audio API ile 100% Prosedürel Sesler:** Harici ses dosyası indirme derdi olmadan sıfır gecikmeli top patlamaları, motor uğultuları, mermi sekme sesleri ve öldürme zilleri.
- 🗺️ **3 Farklı Harita:** Savaş Meydanı (Classic), Şehir Labirenti (Urban Maze), Çöl Kalesi (Desert Fortress).

---

## 🚀 Hızlı Başlangıç

### 1. Sunucuyu Başlatın
Terminalde proje klasöründeyken:

```bash
npm start
```
veya otomatik yeniden yükleme ile geliştirmek için:
```bash
npm run dev
```

### 2. Oyuna Girin
Tarayıcınızda oyunu açın:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Arkadaşlarınla Nasıl Oynanır?

1. **Özel Oda Bağlantısı:**
   - Menüden **"Arkadaşlarınla Özel Oda Aç"** butonuna basın.
   - Haritayı ve bot sayısını seçin.
   - Oyuna girdiğinizde sol üstteki **#ODA_KODU** etiketine tıklayarak doğrudan davet linkini kopyalayıp arkadaşınıza atın!

2. **İnternet Üzerinden (7/24 Bulut Bağlantısı):**
   - Render veya bulut sunucunuz üzerinden verilen güvenli web adresiyle dünyanın her yerinden arkadaşlarınızla anında oynayabilirsiniz.

---

## 🎮 Kontroller

| Tuş | Eylem |
| :--- | :--- |
| **W, A, S, D** / **Yön Tuşları** | Tank Gövdesini Sürme |
| **Fare Hareketi** | Bağımsız Taret / Namlu Nişanı |
| **Sol Tık / Boşluk** | Topu Ateşleme |
| **Shift / Sağ Tık** | Nitro Ani İleri Fırlama (Dash) |
| **TAB (Basılı Tut)** | Canlı Maç Skor Tablosu |
| **ESC** | Duraklatma / Maçtan Ayrılma Menüsü |
| **ENTER** | Taktiksel Sohbet |

---

## 📂 Proje Yapısı

```
├── server/
│   ├── server.js            # Express & Socket.IO sunucusu, REST API
│   ├── GameManager.js       # Odalar, oyuncu eşleştirme ve durum döngüsü
│   ├── GameRoom.js          # Yetkili oyun motoru, fizik, mermi & çarpışma kontrolü
│   ├── BotAI.js             # Tahmini nişan alabilen akıllı bot yapay zekası
│   ├── MapData.js           # Harita düzenleri, tuğla & çelik koordinatları
│   ├── LeaderboardStore.js  # Kalıcı ELO, K/D ve lig veritabanı (JSON)
│   └── Constants.js         # Hız, hasar, silah ve lig yapılandırmaları
├── public/
│   ├── index.html           # Siber/askeri arayüz, lobi, HUD ve modallar
│   ├── css/style.css        # Neon siberpunk stil ve duyarlı tasarım
│   └── js/
│       ├── AudioManager.js  # Web Audio API prosedürel ses sentezleyici
│       ├── ParticleSystem.js# Tank palet izleri, patlamalar, mermi kıvılcımları
│       ├── Renderer.js      # 60 FPS HTML5 Canvas çizim motoru & mini harita
│       ├── GameClient.js    # Ağ senkronizasyonu ve kullanıcı kontrolleri
│       ├── UI.js            # HUD, leş akışı (kill feed) ve skor tablosu
│       └── main.js          # Giriş noktası ve lobi yönetimi
```
