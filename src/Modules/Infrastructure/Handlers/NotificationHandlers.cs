using MediatR;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Epiknovel.Shared.Infrastructure.Hubs;
using Polly;

namespace Epiknovel.Modules.Infrastructure.Handlers;

// Merkezi Bildirim Yöneticisi: Olayları (Events) yakalar ve hem DB'ye yazar hem de SignalR ile fırlatır.
public class NotificationHandlers(
    INotificationService notificationService,
    IAuthStateService authStateService,
    IHubContext<GlobalNotificationHub> hubContext,
    ILibraryProvider libraryProvider,
    Epiknovel.Shared.Core.Interfaces.Management.IEmailTemplateService emailTemplateService,
    IUserAccountProvider userAccountProvider) : 
    INotificationHandler<AuthorApplicationReviewedEvent>,
    INotificationHandler<PaidAuthorApplicationReviewedEvent>,
    INotificationHandler<InvoiceUploadedEvent>,
    INotificationHandler<OrderPaidEvent>,
    INotificationHandler<UserRoleUpdatedEvent>,
    INotificationHandler<CommentCreatedEvent>,
    INotificationHandler<ChapterPublishedEvent>,
    INotificationHandler<SupportResponseReceivedEvent>
{
    // Polly Resiliency Policy: 3 kez dene, her seferinde bekleme süresini artır (Exponential Backoff)
    private readonly IAsyncPolicy _retryPolicy = Policy
        .Handle<Exception>()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));

    private async Task PushRealTimeAsync(Guid userId, string method, object data, CancellationToken ct)
    {
        await _retryPolicy.ExecuteAsync(async () => 
        {
            // SignalR üzerinden kullanıcıya anlık bildirim fırlat
            await hubContext.Clients.User(userId.ToString()).SendAsync(method, data, ct);
        });
    }

    public async Task Handle(SupportResponseReceivedEvent notification, CancellationToken ct)
    {
        var title = "Destek Talebiniz Yanıtlandı";
        var message = $"`{notification.TicketTitle}` konulu talebinize yeni bir yanıt geldi.";
        
        await notificationService.SendSystemNotificationAsync(notification.UserId, title, message, notification.TicketLink, ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title, message, url = notification.TicketLink }, ct);

        // 🚀 AKILLI KONTROL: Kullanıcı o an online değilse mail gönder
        // Not: Gerçek bir 'Presence' servisi yoksa her zaman gönderilir. 
        // Şimdilik SignalR üzerinden 'User' grubuna mesaj gidip gitmediğini varsayıyoruz.
        var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        if (!string.IsNullOrEmpty(email))
        {
            var templateVariables = new Dictionary<string, string>
            {
                { "{USER_NAME}", displayName ?? "Üye" },
                { "{TICKET_TITLE}", notification.TicketTitle },
                { "{RESPONSE_MESSAGE}", notification.ResponseMessage },
                { "{TICKET_LINK}", notification.TicketLink }
            };

            var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("SupportResponse", templateVariables, ct);
            await notificationService.SendEmailAsync(email, subject, body, ct);
        }
    }

    public async Task Handle(CommentCreatedEvent notification, CancellationToken ct)
    {
        // Yorum bildirimini kitaba göre veya bölüme göre yazara gönder
        // Şimdilik sadece sistemi denemek için bir notification atalım
        if (notification.BookId.HasValue)
        {
            // TODO: Kitap sahibini (AuthorId) bulup ona gönder
            // Şimdilik sadece log ve dummy push
        }
    }

    public async Task Handle(UserRoleUpdatedEvent notification, CancellationToken ct)
    {
        await notificationService.SendSystemNotificationAsync(
            notification.UserId, 
            "Yetkiniz Değişti", 
            notification.Description, 
            null, 
            ct);

        await authStateService.HandlePermissionsChangedAsync(notification.UserId, notification.Description, ct);
        await PushRealTimeAsync(notification.UserId, "RoleUpdated", new { newRole = notification.NewRole }, ct);
    }
    public async Task Handle(AuthorApplicationReviewedEvent notification, CancellationToken ct)
    {
        var title = notification.IsApproved ? "Yazarlık Başvurunuz Onaylandı!" : "Yazarlık Başvurusu Reddedildi";
        var message = notification.IsApproved 
            ? "Tebrikler! Artık Epiknovel üzerinden kitap oluşturabilirsiniz." 
            : $"Maalesef başvurunuz reddedildi. Nedeni: {notification.Note}";
        
        await notificationService.SendSystemNotificationAsync(notification.UserId, title, message, "/author?tab=stats", ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title, message }, ct);
        
        // 📧 EMAIL SENDING: Yeni şifreleme ve şablon sistemi ile mail gönderimi
        var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        if (!string.IsNullOrEmpty(email))
        {
            var templateVariables = new Dictionary<string, string>
            {
                { "{USER_NAME}", displayName ?? "Üye" },
                { "{AUTHOR_NAME}", displayName ?? "Yazar" },
                { "{SETTINGS_LINK}", "/author?tab=stats" }, // 🚀 TALEP: Yazar paneline yönlendirme
                { "{RESPONSE_MESSAGE}", notification.Note ?? "Başvurunuz onaylandı." }
            };

            var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("AuthorApproval", templateVariables, ct);
            await notificationService.SendEmailAsync(email, subject, body, ct);
        }

        if (notification.IsApproved)
        {
            await authStateService.HandlePermissionsChangedAsync(notification.UserId, "Yazarlık yetkiniz aktifleştirildi.", ct);

            // Veritabanına rol değişim bildirimini de kaydet
            await notificationService.SendSystemNotificationAsync(
                notification.UserId, 
                "Yetki Seviyeniz Güncellendi", 
                "Tebrikler! Hesabınıza 'Yazar (Author)' yetkisi eklenmiştir. Artık içeriklerinizi yönetebilirsiniz.", 
                "/author?tab=stats", 
                ct);

            // Frontend'e 'Rolün değişti, token tazele' komutu gönder
            await PushRealTimeAsync(notification.UserId, "RoleUpdated", new { newRole = "Author" }, ct);
        }
    }

    public async Task Handle(PaidAuthorApplicationReviewedEvent notification, CancellationToken ct)
    {
        var title = notification.IsApproved ? "Ücretli Yazarlığınız Aktif!" : "Ücretli Yazarlık Başvurusu Reddedildi";
        var message = notification.IsApproved 
            ? "Artık bölümlerinize fiyat belirleyebilir ve kazanç elde edebilirsiniz." 
            : $"Başvurunuzda eksikler tespit edildi. Nedeni: {notification.Note}";

        await notificationService.SendSystemNotificationAsync(notification.UserId, title, message, "/author?tab=stats", ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title, message }, ct);

        if (notification.IsApproved)
        {
            await authStateService.HandlePermissionsChangedAsync(notification.UserId, "Ücretli yazarlık yetkiniz aktifleştirildi.", ct);

            // Veritabanına rol değişim bildirimini de kaydet
            await notificationService.SendSystemNotificationAsync(
                notification.UserId, 
                "Yetki Seviyeniz Güncellendi", 
                "Tebrikler! Hesabınıza 'Ücretli Yazar (PaidAuthor)' yetkisi eklenmiştir. Kazanç sisteminiz aktiftir.", 
                "/author?tab=stats", 
                ct);

            await PushRealTimeAsync(notification.UserId, "RoleUpdated", new { newRole = "PaidAuthor" }, ct);
        }
    }

    public async Task Handle(InvoiceUploadedEvent notification, CancellationToken ct)
    {
        await notificationService.SendSystemNotificationAsync(
            notification.UserId, 
            "Faturanız Oluşturuldu", 
            "Ödemeniz için faturanız hazır. Sipariş geçmişinizden inceleyebilirsiniz.", 
            $"/profile/orders/{notification.OrderId}", 
            ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title = "Faturanız Hazır", message = "Yeni faturanız yüklendi.", url = $"/profile/orders/{notification.OrderId}" }, ct);
    }

    public async Task Handle(OrderPaidEvent notification, CancellationToken ct)
    {
        await notificationService.SendSystemNotificationAsync(
            notification.UserId, 
            "Ödeme Başarılı", 
            $"{notification.CoinAmount} Adet Coin hesabınıza yüklendi. Keyifli okumalar!", 
            $"/profile/orders/{notification.OrderId}", 
            ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title = "Ödeme Başarılı", message = $"{notification.CoinAmount} Adet Coin hesabınıza yüklendi.", url = $"/profile/orders/{notification.OrderId}" }, ct);

        await PushRealTimeAsync(notification.UserId, "WalletUpdated", new { amount = notification.Amount, coinAmount = notification.CoinAmount }, ct);
    }

    public async Task Handle(ChapterPublishedEvent notification, CancellationToken ct)
    {
        // 1. Kitabı takip eden aboneleri bul (Social Modülü üzerinden)
        var subscribers = await libraryProvider.GetSubscribersAsync(notification.BookId, ct);

        if (subscribers == null || subscribers.Count == 0) return;

        var title = "Yeni Bölüm!";
        var message = $"`{notification.BookTitle}` kitabına yeni bir bölüm eklendi: `{notification.ChapterTitle}`";
        var url = $"/read/{notification.BookSlug}/{notification.ChapterSlug}";

        // 2. Veritabanına Toplu Bildirim Kaydet (PERFORMANS: Tek seferde DB'ye yazar)
        await notificationService.SendSystemNotificationBatchAsync(subscribers, title, message, url, ct);

        // 3. Real-time (SignalR) Push - TOPLU GÖNDERİM (Hub üzerindeki Clients.Users)
        // SignalR motoru, bu liste içindeki tüm bağlı client'lara tek seferde fırlatır.
        var subscriberIdsStrings = subscribers.Select(id => id.ToString()).ToList();
        
        await _retryPolicy.ExecuteAsync(async () => 
        {
            await hubContext.Clients.Users(subscriberIdsStrings).SendAsync("NotificationReceived", new { 
                title, 
                message, 
                url,
                type = "NewChapter"
            }, ct);
        });
    }
}
