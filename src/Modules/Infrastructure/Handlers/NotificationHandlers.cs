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
    ILibraryProvider libraryProvider) : // 📚 Bildirim hedefi için eklendi
    INotificationHandler<AuthorApplicationReviewedEvent>,
    INotificationHandler<PaidAuthorApplicationReviewedEvent>,
    INotificationHandler<InvoiceUploadedEvent>,
    INotificationHandler<OrderPaidEvent>,
    INotificationHandler<UserRoleUpdatedEvent>,
    INotificationHandler<CommentCreatedEvent>,
    INotificationHandler<ChapterPublishedEvent> // 📚 Yeni bildirim hattı
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
        await notificationService.SendSystemNotificationAsync(notification.UserId, title, message, "/author/dashboard", ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title, message }, ct);
        
        if (notification.IsApproved)
        {
            await authStateService.HandlePermissionsChangedAsync(notification.UserId, "Yazarlık yetkiniz aktifleştirildi.", ct);

            // Veritabanına rol değişim bildirimini de kaydet
            await notificationService.SendSystemNotificationAsync(
                notification.UserId, 
                "Yetki Seviyeniz Güncellendi", 
                "Tebrikler! Hesabınıza 'Yazar (Author)' yetkisi eklenmiştir. Artık içeriklerinizi yönetebilirsiniz.", 
                "/author/dashboard", 
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

        await notificationService.SendSystemNotificationAsync(notification.UserId, title, message, "/author/dashboard", ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title, message }, ct);

        if (notification.IsApproved)
        {
            await authStateService.HandlePermissionsChangedAsync(notification.UserId, "Ücretli yazarlık yetkiniz aktifleştirildi.", ct);

            // Veritabanına rol değişim bildirimini de kaydet
            await notificationService.SendSystemNotificationAsync(
                notification.UserId, 
                "Yetki Seviyeniz Güncellendi", 
                "Tebrikler! Hesabınıza 'Ücretli Yazar (PaidAuthor)' yetkisi eklenmiştir. Kazanç sisteminiz aktiftir.", 
                "/author/dashboard", 
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
            $"/wallet/orders/{notification.OrderId}/invoice", 
            ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title = "Faturanız Hazır", message = "Yeni faturanız yüklendi." }, ct);
    }

    public async Task Handle(OrderPaidEvent notification, CancellationToken ct)
    {
        await notificationService.SendSystemNotificationAsync(
            notification.UserId, 
            "Ödeme Başarılı", 
            $"{notification.CoinAmount} Adet Coin hesabınıza yüklendi. Keyifli okumalar!", 
            "/wallet/history", 
            ct);

        await PushRealTimeAsync(notification.UserId, "WalletUpdated", new { amount = notification.Amount, coinAmount = notification.CoinAmount }, ct);
    }

    public async Task Handle(ChapterPublishedEvent notification, CancellationToken ct)
    {
        // 1. Kitabı takip eden aboneleri bul (Social Modülü üzerinden)
        var subscribers = await libraryProvider.GetSubscribersAsync(notification.BookId, ct);

        if (subscribers == null || subscribers.Count == 0) return;

        var title = "Yeni Bölüm!";
        var message = $"`{notification.BookTitle}` kitabına yeni bir bölüm eklendi: `{notification.ChapterTitle}`";
        var url = $"/books/chapters/{notification.ChapterSlug}";

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
