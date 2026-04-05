# Books Modülü Teknik Dokümantasyonu

Bu doküman, Epiknovel projesindeki **Books (Kitaplar)** modülünün mimari yapısını, performans stratejilerini, güvenlik önlemlerini ve ölçeklenebilirlik çözümlerini detaylandırmaktadır.

---

## 1. Mimari Genel Bakış (Modülerlik)

Books modülü, projenin **Modüler Monolit** mimarisine uygun olarak, iş mantığını ve veri depolama katmanını tamamen izole edecek şekilde tasarlanmıştır.

- **Şema İzolasyonu**: Veritabanında kendine ait `books` şemasını kullanır (`BooksDbContext.cs`). Diğer modüllerle tablo seviyesinde bağımlılık kurmaz.
- **Genişletilebilirlik**: `BooksModuleExtensions.cs` üzerinden diğer modüllere hizmet sağlayan provider'ları (`IBookProvider`, `IFileUsageProvider` vb.) dışa açar.
- **Haberleşme**: Diğer modüllerle haberleşme için **MediatR** ve **Domain Events** (Outbox desenli) kullanır. `Wallet` ve `Social` modülleriyle arayüzler (`IWalletProvider`, `IReadingProgressProvider`) üzerinden entegre olur.

---

## 2. Performans Stratejileri

Okuma ağırlıklı bir sistem olduğu için çok katmanlı bir performans mimarisi uygulanmıştır:

### A. Cache Stampede & Thundering Herd Koruması
- **Chapter Cacheing**: `GetChapter` endpoint'i, bölümleri Redis üzerinde cache'ler. 
- **Akıllı Karar Mekanizması**: Sadece `Published` durumdaki bölümler cache'e alınırken, `Draft` bölümler her zaman güncel kalması için DB'den çekilir.

### B. Redis Hit-Buffering (Sayaç Optimizasyonu)
- Bölüm izlenme sayıları her okumada doğrudan SQL veritabanına yazılmaz.
- **Mekanizma**: İzlenme sayıları önce Redis üzerinde `chapter:hits:{id}` anahtarıyla artırılır. `ChapterStatsSyncWorker` arka planda (periodic) bu verileri toplu şekilde SQL'e senkronize eder.
- **Anlık Geri Bildirim**: Kullanıcı bölümü yenilediğinde, SQL değeri ile Redis'teki tampon değer toplanarak gösterilir (Technical Decision 4).

### C. Ef Core & SQL Optimizasyonları
- **Projeksiyonlar**: `Select()` ile sadece gereken sütunlar çekilir (Paragraph Content, Title vb.), tüm entity yüklenmez.
- **Indexleme**: `Slug`, `Order` ve `ChapterId` gibi alanlar üzerinde özelleştirilmiş index'ler bulunur.
- **Sequential Read**: Paragraflar `(ChapterId, Order)` index'i üzerinden sıralı olarak çekilerek I/O maliyeti düşürülür.

---

## 3. Güvenlik Ömlemleri

Modül içindeki veri güvenliği ve erişim kontrolü katı kurallara bağlanmıştır:

### A. Yetkilendirme ve BOLA Koruması
- **BOLA (Broken Object Level Authorization)**: Bir bölümün taslağına sadece kitabın sahibi (`AuthorUserId` kontrolü) veya `ModerateContent` yetkisine sahip moderatörler erişebilir.
- **Slug-based Routing**: Kaynaklara ID yerine rastgele olmayan, tahmin edilebilir ama yetkiyle korunan slug'lar üzerinden erişilir.

### B. İçerik Kısıtlama Mekanizması
- **Ücretli İçerik**: `IWalletProvider` üzerinden kullanıcının bölümü satın alıp almadığı kontrol edilir.
- **E-posta Doğrulama**: Hesabını onaylamamış kullanıcılar, kitabın ilk bölümü dışındaki (Order > 1) içeriklerin sadece %15'ini görebilir.
- **Preview Sistemi**: Yetkisiz/satın alınmamış içerikler API seviyesinde kırpılarak (`Take(15%)`) gönderilir, frontend gizlemesine güvenilmez.

---

## 4. Ölçeklenebilirlik ve Güvenilirlik

Sistem, yük altında kararlı çalışmak ve veri kaybını önlemek için asenkron desenleri benimsemiştir:

### A. Event-Driven Outbox Pattern (PostgreSQL LISTEN/NOTIFY)
- **Güvenli Mesajlaşma**: Bir kitap oluşturulduğunda veya güncellendiğinde, olaylar (Search Indexing vb.) atomik bir transaction ile `OutboxMessages` tablosuna yazılır.
- **Gerçek Zamanlı İşleme**: `OutboxProcessorWorker`, sürekli polling yapmak yerine PostgreSQL'in native `LISTEN/NOTIFY` özelli yardımıyla yeni mesaj geldiğinde milisaniyeler içinde tetiklenir.
- **Hata Toleransı**: İşlenemeyen mesajlar için `RetryCount` ve her 2 dakikada bir çalışan `FallbackTimer` mekanizması bulunur.

### B. Arka Plan İşlemleri (Background Workers)
- **ChapterStatsSyncWorker**: İstatistikleri (izlenme sayısı gibi) belirli periyotlarla toplu işler.
- **ScheduledPublishWorker**: Gelecek tarihli bölümlerin otomatik yayınlanmasını sağlar.
- **Asenkron Hit Counting**: Kullanıcının bekleme süresini azaltmak için hit sayacı işlemleri `Task.Run` ile fire-and-forget şeklinde gerçekleştirilir.

---

## 5. Veri Modeli ve İndeksleme

Tüm ana tablolar (Books, Chapters, Paragraphs) **Soft Delete** (`IsDeleted` filtresi) ile korunmaktadır. EF Core `HasQueryFilter` özelliği sayesinde, silinen kayıtlar uygulama seviyesinde otomatik olarak filtrelenir.

> [!TIP]
> Performans için büyük bölümlerde (2000'den fazla paragraf) otomatik kırpma (`MaxParagraphsPerResponse`) uygulanarak API yanıt süreleri garanti altına alınır.
