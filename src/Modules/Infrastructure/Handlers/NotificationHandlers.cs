using MediatR;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Epiknovel.Shared.Infrastructure.Hubs;

namespace Epiknovel.Modules.Infrastructure.Handlers;

// Merkezi Bildirim Yöneticisi: Olayları (Events) yakalar ve hem DB'ye yazar hem de SignalR ile fırlatır.
public class NotificationHandlers(
    INotificationService notificationService,
    IHubContext<GlobalNotificationHub> hubContext) : 
    INotificationHandler<AuthorApplicationReviewedEvent>,
    INotificationHandler<PaidAuthorApplicationReviewedEvent>,
    INotificationHandler<InvoiceUploadedEvent>,
    INotificationHandler<OrderPaidEvent>,
    INotificationHandler<UserRoleUpdatedEvent>
{
    private async Task PushRealTimeAsync(Guid userId, string method, object data, CancellationToken ct)
    {
        // SignalR üzerinden kullanıcıya anlık bildirim fırlat
        await hubContext.Clients.User(userId.ToString()).SendAsync(method, data, ct);
    }

    public async Task Handle(UserRoleUpdatedEvent notification, CancellationToken ct)
    {
        await notificationService.SendSystemNotificationAsync(
            notification.UserId, 
            "Yetkiniz Değişti", 
            notification.Description, 
            null, 
            ct);

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
}
