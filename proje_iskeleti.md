# 🏛️ Epiknovel Proje Mimarisi (Modular Monolith)

Bu dosya, Epiknovel projesinin teknik iskeletini; güvenlik, performans ve ölçeklenebilirlik prensiplerini detaylandırmaktadır.

---

## 📂 1. Klasör Yapısı ve Modülerlik
Proje, bağımsız modüllerden oluşan bir monolit yapısındadır. Her modül kendi veritabanı şemasına, domain mantığına ve endpoint tanımlarına sahiptir.

### **Backend (`/src`)**
*   **`Epiknovel.api`**: Giriş noktası (Host). Modüllerin kaydedildiği ve pipeline'ın yapılandırıldığı yer.
*   **`Modules/`**: Her modül (Books, Identity, Social, Wallet vb.) kendi içinde:
    *   `Data/`: DbContext, Migrasyonlar ve Entity konfigürasyonları.
    *   `Domain/`: Modüle özel varlıklar (Entities) ve Enum'lar.
    *   `Endpoints/`: FastEndpoints tabanlı API tanımları.
    *   `Features/`: MediatR (CQRS) Handler ve Command/Query sınıfları.
*   **`Shared/`**: Modüller arası ortak kodlar (Core & Infrastructure).

### **Frontend (`/web`)**
*   **`Next.js 15+`**: App Router mimarisi.
*   **`src/components`**: UI ve Business component'leri.
*   **`src/lib`**: API istemcileri (apiRequest), bildirimler ve utils.

---

## 🔒 2. Güvenlik Tasarımı
Güvenlik, projenin her katmanında en yüksek standartlarda (Hardened) uygulanmıştır.

### **Kimlik ve Yetkilendirme**
*   **JWT & Refresh Token**: Erişim anahtarları (Secure Cookies/Storage) ile uzun süreli ve güvenli oturumlar.
*   **BOLA (Broken Object Level Authorization)**: Pre-Processor'lar ile her kullanıcının sadece kendi verisine erişmesi (Ownership Check) garanti edilir.
*   **Permission-Based Access**: Role-based değil, operasyon bazlı izin sistemi (AddRequirement).

### **Veri Güvenliği**
*   **Audit Logging (Denetim)**: 
    *   `Genel Kayıt`: Kim, ne zaman, ne yaptı?
    *   `Hassas Veri`: Şifre, email gibi alanlar `[Masked]` özniteliği ile loglarda yıldızlanarak saklanır.
*   **CSP & Security Headers**: HSTS, X-Frame-Options (DENY), CSP (Strict) başlıkları ile XSS ve Clickjacking önlenir.

### **Ağ Güvenliği**
*   **Rate Limiting**: 
    *   `Global`: Saniye başı limit.
    *   `Strict`: Hassas işlemler (Login, Sign-up) için 10 saniyelik katı limitler.
    *   `Social`: Takip/Beğeni gibi SPAM riski taşıyan alanlara özel limitler.
*   **CORS**: Sadece yetkili domain'lere (localhost:3000, 127.0.0.1 vb.) açık `credentials` desteği.

---

## 🚀 3. Performans Optimizasyonu
Hız, kullanıcı deneyimi için kritik olduğundan çok katmanlı önbellekleme ve sıkıştırma uygulanmaktadır.

### **Önbellekleme (Caching)**
*   **Distributed Cache (Redis)**: Oturum bilgileri ve global ayarlar paylaşımlı bellek üzerindedir.
*   **Output Caching**: API yanıtları sunucu tarafında geçici olarak saklanır (TTL yönetimi).
*   **ETag Support**: Veri değişmediyse istemciye `304 Not Modified` dönülerek bant genişliği korunur.

### **Veri ve İşlem Akışı**
*   **Response Compression**: Brotil/Gzip ile JSON yanıtları %70'e varan oranlarda sıkıştırılır.
*   **Async Background Workers**: 
    *   `Image Processing`: Kitap kapakları ve avatarlar asenkron kuyruk yapısı ile arka planda işlenir, kullanıcı bekletilmez.
    *   `Audit Worker`: Log yazma işlemleri asenkron kuyruk yapısı ile ana thread'i bloklamaz.

---

## 📈 4. Ölçeklenebilirlik ve Gelecek
Proje, yüksek trafik ve veri büyümesine hazır şekilde tasarlanmıştır.

*   **Read/Write Separation**: Entity Framework Interceptor'ları ile gelecekte okuma ve yazma veritabanlarını ayırmaya uygun altyapı.
*   **Redis Backplane**: SignalR anlık bildirimleri, birden fazla sunucu (Scale-out) olsa bile Redis üzerinden senkronize edilir.
*   **Dockerized Deployment**: Tüm hizmetler (PostgreSQL, Redis, API, Web) konteynerlar üzerinde izole ve ölçeklenebilir çalışır.
*   **Modular Monolith -> Microservices**: Her modül kendi DbContext'ine ve şemasına sahip olduğu için, ihtiyaç duyulduğunda ilgili modül tek başına bir mikroservise dönüştürülebilir.

---

## 🛡️ 5. Sistem Bütünlüğü ve Dayanıklılık (Resiliency)
Sistem, beklenmedik hatalara ve dış servis kesintilerine karşı dayanıklı (Hardened) tasarlanmıştır.

*   **Global Exception Handling**: Tüm modüllerdeki hatalar `GlobalExceptionHandler` middleware ile yakalanır ve standart **ProblemDetails** (RFC 7807) formatında dönülür.
*   **Hata Yönetimi (Polly)**: Dış servislerde (Örn: Ödeme, E-posta) oluşabilecek geçici kesintiler için **Retry (Yeniden Deneme)** ve **Circuit Breaker (Devre Kesici)** politikaları uygulanır.
*   **Veri Doğrulama (Fail-Fast)**: FluentValidation ve FastEndpoints entegrasyonu ile istekler daha Handler'a ulaşmadan şema ve iş mantığı seviyesinde doğrulanır ve geçersiz istekler pipeline'ın başında reddedilir.
*   **Sağlık Kontrolleri (Health Checks)**: `/health` endpoint'i üzerinden DB, Redis ve FileStorage bağlantılarının durumu anlık izlenir.

---

## 🗺️ 6. Gelecek Yol Haritası (Roadmap)
Projenin teknolojik olgunluğunu artırmak için planlanan adımlar:

*   **Transactional Outbox Pattern**: Veri tutarlılığını garanti etmek için `Outbox` tabanlı asenkron olay (event) yönetimi.
*   **Auto-Generated TS Clients (Contract-First)**: Backend modellerini (Contracts) otomatik olarak Frontend TypeScript arayüzlerine dönüştüren **Swagger-to-TS** entegrasyonu.
*   **Merkezi Log Analizi**: Logların Grafana Loki veya ElasticSearch ortamına aktarılması.
*   **Testing Strategy**: xUnit (Unit), FluentAssertions (Integration) ve Playwright (E2E) ile test kapsama oranının artırılması.

---

## 🛠️ 7. Geliştirme Standartları
Mimari disiplini korumak için uygulanan temel kurallar:

*   **Clean Code & CQRS**: Tüm iş mantığı `Features/` altındaki Handler'larda izole edilir. Endpoints (Kontrolcüler) sadece orkestrasyon ve mapping yapar.
*   **Schema Isolation**: Her modül sadece kendi PostgreSQL şemasından (Örn: `books`, `wallet`) sorumludur. Modüller birbirinin şemasına doğrudan SQL ile erişemez; sadece **Integration Events** ile haberleşir.
*   **Loose Coupling**: Modüller arası doğrudan servis referansı yasaktır; iletişim `Shared` kütüphanesi üzerinden yürütülür.
*   **Transactional Integrity & Concurrency**: Cüzdan (Wallet) gibi kritik modüllerde veri tutarlılığı için **Optimistic Concurrency** (RowVersion) veya **Row-Level Locking** (Pessimistic) stratejileri uygulanır.
*   **API Versioning**: Gelecekteki uyumluluk sorunlarını önlemek için tüm API rotaları `api/v1/...` şeklinde versiyonlanır ve başlık tabanlı versiyon değişimini destekler.

---

## 🧰 8. Teknik Yığın (Tech Stack)
*   **Backend**: .NET 10, EF Core 10 (PostgreSQL 17), MediatR, FastEndpoints.
*   **Frontend**: Next.js 15, Tailwind CSS, Framer Motion, TypeScript.
*   **Database**: PostgreSQL 17, Redis.
*   **Observability**: OpenTelemetry, Serilog.
