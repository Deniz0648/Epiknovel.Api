# EpikNovel Okuma Ekranı (Reader) Görsel ve Tasarım Rehberi

Bu doküman, EpikNovel projesinde kullanılan, kullanıcı odaklı, premium ve özelleştirilebilir okuma deneyiminin tüm görsel ve fonksiyonel bileşenlerini detaylandırır. Yeni bir projede bu arayüzü yeniden kurgulamak için gerekli olan tasarım dilleri, bileşen yapıları ve UX tercihlerini içerir.

---

## 1. Tasarım Felsefesi ve Estetik
*   **Premium Deneyim**: Kullanıcıyı yormayan, dikkat dağıtmayan (distraction-free) bir odak sunar.
*   **Dinamik Temalandırma**: `DaisyUI` altyapısı ile birlikte özel "Sepia" ve "Midnight" gibi temalar sunularak her ışık koşuluna uyum sağlar.
*   **Tipografi Öncelikli**: Okuma konforu için `serif`, `sans`, `mono` seçenekleri ve dinamik font/satır aralığı kontrolleri.
*   **Glassmorphism**: Üst bar ve kontrollerde `backdrop-blur` (bulanık arka plan) kullanılarak derinlik hissi yaratılır.

---

## 2. Üst Navigasyon (Header)
Okuma ekranının kontrol merkezi olan üst bar, akıllı bir gizlenme mekanizmasına sahiptir.

### Görsel Özellikler
- **Yapı**: `fixed` pozisyon, `bg-base-100/80` arka plan ve `backdrop-blur-md` bulanıklığı.
- **Akıllı Davranış**: Kullanıcı aşağı kaydırdığında (scroll) gizlenir, yukarı kaydırdığında veya sayfa başına geldiğinde tekrar belirir. "Sabitleme" (Pin) özelliği ile sürekli görünür hale getirilebilir.
- **Elemanlar**: 
    - **Geri Butonu**: `ChevronLeft` ikonu ile kitap detayına dönüş.
    - **Bölüm Başlığı**: Orta-sol kısımda, uzun başlıklar için `line-clamp-1` kısıtlaması.
    - **Kontroller (Sağ Kısım)**:
        - **Bölüm Yorumları**: Toplam yorum sayısını gösteren bildirim badge'i ile `MessageSquare`.
        - **Paylaşım Menüsü**: Web Share API entegrasyonlu menü.
        - **Okuma Ayarları**: Ayarlar panelini tetikleyen `Settings` çarkı.
        - **Ana Sayfa**: Hızlı erişim ikonu.

---

## 3. Okuma Ayarları Paneli (Reader Settings)
Kullanıcının okuma deneyimini kendine göre terzi usulü düzenlediği `absolute` modal/popover yapısıdır.

### Ayar Kategorileri
- **Tema (Görünüm)**: 
    - 20'den fazla renk paleti (Light, Dark, Sepia, Dracula, Coffee, vb.).
    - Her tema, tüm arayüz renklerini (arka plan, metin, butonlar) anında güncelleyen `data-theme` özelliğine bağlıdır.
- **Tipografi**:
    - **Boyut**: 12px'ten 32px'e kadar hassas ayar (`Minus`/`Plus` kontrolleri).
    - **Font Tipi**: Serif (daha klasik hikaye hissi), Sans (modern), Mono (teknik).
    - **Satır Aralığı**: 1.2 ile 2.4 arasında değişen kaydırıcı (`range` input).
- **Yerleşim (Layout)**:
    - **Genişlik**: Dar (Narrow), Standart (Standard), Geniş (Wide) seçenekleriyle satır uzunluğu kontrolü.
    - **Okuma Modu**: 
        - **Sonsuz (Infinite)**: Aşağı kaydırdıkça bölümler otomatik yüklenir.
        - **Sayfalı (Paginated)**: Klasik "Sonraki Bölüm" butonlu yapı.
- **Donanım Kontrolleri**:
    - **Tam Ekran**: Tarayıcıyı tam ekrana geçirir ve global header'ı gizler.
    - **Sabitleme**: Üst barın scroll'dan etkilenmemesini sağlar.

---

## 4. İçerik Alanı ve Tipografi
Ziyaretçinin en çok vakit geçirdiği, en kritik bölümdür.

### Metin Düzeni
- **Styling**: `prose` (Tailwind Typography) altyapısı üzerine inşa edilmiştir.
- **Okunabilirlik**: `text-justify` (iki yana yasla) ve geniş padding'ler.
- **Kopya Koruması**: Sağ tık engelleme, metin seçme (`select-none`) ve kopyalama (Ctrl+C) engellemeleri ile içerik güvenliği sağlanır.
- **Spoiler Desteği**: Spoiler içeren bölüm başlıkları `blur-xl` ile gizlenir, tıklandığında görünür hale gelir.

### İnteraktif Bölümler: Satır Arası Yorumlar
Her paragrafın sağında, fare üzerine geldiğinde (hover) beliren bir `MessageSquare` ikonu bulunur.
- Kullanıcılar sadece o paragrafa özel yorum yapabilir.
- Paragraf bazlı yorum sayıları ikonun yanında küçük badge'lerle gösterilir.
- Tıklandığında sağdan açılan (drawer/sidebar) bir sidebar (InlineCommentSidebar) ile yorumlar okunur ve yazılır.

---

## 5. Alt Navigasyon ve İlerleme (Bottom Nav)
- **İlerleme Çubuğu**: Ekranın en altında sabitlenen, kullanıcının bölümde ne kadar ilerlediğini gösteren yüksek kontrastlı ince çubuk.
- **Hızlı Geçiş**: Bölüm numarası (`Bölüm 4 / 45`) ve prev/next butonları.
- **İçindekiler (ToC)**: Tüm bölümlerin listelendiği, hızlı navigasyon sağlayan drawer menü tetikleyicisi.

---

## 6. Premium ve Kilitli İçerik UI (Paywall)
İçeriğin kilitli olduğu durumlarda beliren görsel bloktur.

- **Kilitli Bölüm Kartı**: `card bg-base-200 shadow-inner` yapısında, merkezde büyük bir kilit ikonu.
- **Dinamik Butonlar**: 
    - Satın alma öncesi "Kilidi Aç" butonu ve Coin bedeli.
    - Satın alma anında `Loader` animasyonu ve "Ödemeyi Onayla" uyarısı.
- **Misafir Önizlemesi**: Üye olmayanlar için içeriğin ilk %15'i gösterilirken, kalan kısımlar "Giriş Yap" çağrısıyla (`CTA`) kademeli olarak bulanıklaşır/kesilir.

---

## 7. Kullanılan UI Bileşenleri ve Araçlar
- **Framework**: React 19 + Next.js 16
- **Styling**: Tailwind CSS v4 + DaisyUI
- **Animasyonlar**: Framer Motion (Geçişler ve Hover efektleri)
- **İkon Seti**: `lucide-react`
- **İçerik Render**: Tiptap Editor / SanitizeHtml
- **Temalandırma**: CSS Variables + DaisyUI Data-Theme
