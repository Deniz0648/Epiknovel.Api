# 🔄 Epiknovel İstek Yaşam Döngüsü (Request Lifecycle)

Bu döküman, bir isteğin (request) kullanıcı tarafındaki Web arayüzünden başlayıp, veritabanına ulaşana kadar geçtiği tüm aşamaları görsel ve adım adım açıklamaktadır.

---

## 📊 İstek Akış Diyagramı (Mermaid)

```mermaid
graph TD
    %% 🔵 FRONTEND KATI
    A[Frontend: Next.js / apiRequest] -->|HTTP POST/GET| B[Ağ: Internet / Docker Network]

    %% 🔴 GÜVENLİK VE PERFORMANS PİPELİNE (Middleware)
    B --> C{Güvenlik & Cache Middleware}
    C -->|CSP & HSTS| D[Security Headers]
    D -->|If-Match| D1[Idempotency Check: Redis]
    D1 -->|HIT: Duplicate| G((İstemciye Dön))
    D1 -->|MISS| E[Response Compression]
    E -->|If-None-Match| F{ETag Cache Check?}
    F -->|304 Değişmedi| G
    F -->|Miss| H{Output Cache / Redis?}
    H -->|Hit| I[Cache'ten Yanıt Dön]
    H -->|Miss| J[JWT Auth: Token Validation]
    J --> J1[Middleware: JWT Blacklist Check]
    J1 -->|FAIL: Revoked| G
    J1 -->|SUCCESS| K[FastEndpoints: Input Binding]

    %% 🟢 API KATI (FastEndpoints)
    K -->|CPU Check| K2[Pre-Processor: FluentValidation]
    K2 -->|SUCCESS: Fail-Fast Check| K3[Pre-Processor: BOLA Check / Ownership]
    K3 -->|FAIL: 400/403/401| G
    K3 -->|SUCCESS| L[MediatR Handler]

    %% 🟣 UYGULAMA KATI (MediatR / CQRS)
    L --> M[Business Logic / Features]
    M --> N[Domain Layer / Entities]

    %% 🟤 VERİ KATI (EF Core / PostgreSQL)
    N --> O[EF Core DbContext]
    O -->|AuditInterceptor| P[(PostgreSQL 17: Transactional Storage)]

    %% 🔄 GERİ DÖNÜŞ AKIŞI
    P -->|Data Set| O
    O -->|Result Object| L
    L -->|SignalR Hub| L1[Real-time Broadcast: Notifications]
    L -->|Response Object| Q[Post-Processor: GlobalAuditPostProcessor]
    Q --> R[Cache Update / Invalidation]
    R --> S[ETag Generation / Response Headers]
    S --> G

    style A fill:#3498db,stroke:#2980b9,color:#fff
    style P fill:#2c3e50,stroke:#27ae60,color:#fff
    style H fill:#e67e22,stroke:#d35400,color:#fff
    style K fill:#27ae60,stroke:#219150,color:#fff
    style D1 fill:#f1c40f,stroke:#f39c12,color:#222
    style L1 fill:#e91e63,stroke:#c2185b,color:#fff
    style Q fill:#9b59b6,stroke:#8e44ad,color:#fff
```

---

## 🚀 Durak Detayları

### 1. **Frontend (Next.js)**
`apiRequest` fonksiyonu ile istek başlatılır. `credentials: 'include'` ile JWT (veya Cookie) otomatik olarak eklenir.

### 2. **Pipeline (Middleware Layer)**
Sunucuya ulaşan istek ilk olarak performansa ve güvenliğe tabi tutulur:
*   **Response Compression**: Yanıtlar yolda sıkıştırılır.
*   **ETag (Marvin.Cache.Headers)**: "Veri bende zaten var" diyen tarayıcıya (veya Redis'e) sorulur. Veri değişmediyse 304 döner.
*   **Output Cache (Redis)**: Eğer tam bu isteğin yanıtı Redis'te varsa, hiç koda girmeden yanıt dönülür.

### 3. **Authentication & Rate Limiting**
*   **JWT Validation**: Token'ın süresi, imzası ve blacklist (Redis üzerinden) durumu kontrol edilir.
*   **Rate Limiter**: Kullanıcının (veya IP'nin) saniyelik/dakikalık limitleri aşmadığı doğrulanır.

### 4. **API Katı (FastEndpoints)**
*   **Routing**: İstek doğru handler ile eşleşir.
*   **Pre-Processors**: 
    - `FluentValidation`: Veri tipi ve iş kuralları doğruluğu.
    - `BOLA (Broken Object Level Authorization)`: Kullanıcının sadece **kendi** verisine erişip erişmediği kontrol edilir (örn: Benim yorumum mu?).

### 5. **Uygulama Katı (MediatR)**
*   **Handler**: İş mantığının (Business Logic) kalbidir. Modüller arası zayıf bağlılık ile çalışır. `Post-Processors` burada denetim (Audit) kuyruğuna veri ekler.

### 6. **Veri Katı (EF Core & PostgreSQL)**
*   **Audit Interceptor**: Veri kaydedilmeden hemen önce `[Masked]` alanları ayıklar ve merkezi log tablosuna neyin değiştiğini `Background Worker` ile asenkron yazar.
*   **PostgreSQL 17**: Veri kalıcı olarak saklanır.

---

## ⚡ Neden Bu Kadar Çok Durak Var?
Bu yapılandırma, uygulamanın **Ölçeklenebilirlik (Scalability)** ve **Güvenlik (Security)** açısından sarsılmaz olmasını sağlar. Çok katmanlı önbellekleme (Caching) sayesinde veritabanı trafiği minimize edilirken, BOLA ve Rate Limiters gibi bileşenler sistemi kötü niyetli saldırılara karşı korur.
