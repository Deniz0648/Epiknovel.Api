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
    IUserAccountProvider userAccountProvider,
    Epiknovel.Shared.Core.Interfaces.Books.IBookProvider bookProvider,
    Epiknovel.Shared.Core.Interfaces.Users.INotificationPreferenceProvider preferenceProvider) : 
    INotificationHandler<AuthorApplicationReviewedEvent>,
    INotificationHandler<PaidAuthorApplicationReviewedEvent>,
    INotificationHandler<InvoiceUploadedEvent>,
    INotificationHandler<OrderPaidEvent>,
    INotificationHandler<UserRoleUpdatedEvent>,
    INotificationHandler<CommentCreatedEvent>,
    INotificationHandler<ReviewCreatedEvent>,
    INotificationHandler<ChapterPublishedEvent>,
    INotificationHandler<SupportResponseReceivedEvent>,
    INotificationHandler<PasswordResetRequestedEvent>,
    INotificationHandler<AuthorApplicationSubmittedEvent>,
    INotificationHandler<PaidAuthorApplicationSubmittedEvent>

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

    private async Task PushToGroupAsync(string groupName, string method, object data, CancellationToken ct)
    {
        await _retryPolicy.ExecuteAsync(async () => 
        {
            // SignalR üzerinden belirli bir gruba (örn: Admins) anlık bildirim fırlat
            await hubContext.Clients.Group(groupName).SendAsync(method, data, ct);
        });
    }

    public async Task Handle(AuthorApplicationSubmittedEvent notification, CancellationToken ct)
    {
        var title = "Yeni Yazarlık Başvurusu";
        var message = $"{notification.UserName} yeni bir yazarlık başvurusu yaptı.";
        var url = "/management/requests";

        // Tüm adminlere anlık bildirim gönder
        await PushToGroupAsync("Admins", "NotificationReceived", new { title, message, url }, ct);
    }

    public async Task Handle(PaidAuthorApplicationSubmittedEvent notification, CancellationToken ct)
    {
        var title = "Yeni Ücretli Yazarlık Başvurusu";
        var message = $"{notification.UserName} yeni bir ücretli yazarlık başvurusu yaptı.";
        var url = "/management/requests";

        // Tüm adminlere anlık bildirim gönder
        await PushToGroupAsync("Admins", "NotificationReceived", new { title, message, url }, ct);
    }

    public async Task Handle(SupportResponseReceivedEvent notification, CancellationToken ct)
    {
        var title = "Destek Talebiniz Yanıtlandı";
        var message = $"`{notification.TicketTitle}` konulu talebinize yeni bir yanıt geldi.";
        
        await notificationService.SendSystemNotificationAsync(notification.UserId, title, message, notification.TicketLink, ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title, message, url = notification.TicketLink }, ct);

        var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        if (!string.IsNullOrEmpty(email))
        {
            var templateVariables = new Dictionary<string, string>
            {
                { "{UserName}", displayName ?? "Üye" },
                { "{TicketTitle}", notification.TicketTitle },
                { "{ResponseMessage}", notification.ResponseMessage },
                { "{TicketLink}", notification.TicketLink }
            };

            var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("SupportResponse", templateVariables, ct);
            await notificationService.SendEmailAsync(email, subject, body, ct);
        }
    }

    public async Task Handle(ReviewCreatedEvent notification, CancellationToken ct)
    {
        // 1. Kitap yazarını bul
        var authorId = await bookProvider.GetBookOwnerIdAsync(notification.BookId, ct);
        if (!authorId.HasValue) return;

        // 2. Sistem içi bildirim
        var userInfo = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        var reviewerName = userInfo.DisplayName;
        var title = "Yeni İnceleme!";
        var message = $"`{reviewerName}` kitabınız hakkında yeni bir inceleme yazdı.";
        var url = $"/book/{notification.BookId}"; // TODO: Slugified URL

        await notificationService.SendSystemNotificationAsync(authorId.Value, title, message, url, ct);
        await PushRealTimeAsync(authorId.Value, "NotificationReceived", new { title, message, url }, ct);

        // 3. E-posta (Tercih kontrolü ile)
        if (await preferenceProvider.CanSendEmailAsync(authorId.Value, "NewReview", ct))
        {
            var authorInfo = await userAccountProvider.GetUserBasicInfoAsync(authorId.Value, ct);
            var authorEmail = authorInfo.Email;
            var authorName = authorInfo.DisplayName;

            if (!string.IsNullOrEmpty(authorEmail))
            {
                var bookBasics = await bookProvider.GetBookBasicsByIdsAsync([notification.BookId], ct);
                var bookTitle = bookBasics.TryGetValue(notification.BookId, out var basics) ? basics.Title : "Kitabınız";

                var templateVariables = new Dictionary<string, string>
                {
                    { "{UserName}", authorName ?? "Yazar" },
                    { "{ReviewerName}", reviewerName ?? "Bir Okur" },
                    { "{BookTitle}", bookTitle },
                    { "{ActionLink}", url }
                };

                var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("NewReviewEmail", templateVariables, ct);
                await notificationService.SendEmailAsync(authorEmail, subject, body, ct);
            }
        }
    }

    public async Task Handle(CommentCreatedEvent notification, CancellationToken ct)
    {
        Guid? targetUserId = null;
        string templateKey = "NewCommentEmail";
        string prefType = "NewComment";

        if (notification.ChapterId.HasValue)
        {
            // Bölüm/Paragraf Yorumu -> Bölüm yazarını bul
            targetUserId = await bookProvider.GetChapterAuthorIdAsync(notification.ChapterId.Value, ct);
        }
        else if (notification.BookId.HasValue)
        {
            // Kitap Yorumu (İnceleme) -> Kitap yazarını bul
            targetUserId = await bookProvider.GetBookOwnerIdAsync(notification.BookId.Value, ct);
            templateKey = "NewReviewEmail";
            prefType = "NewReview";
        }

        if (!targetUserId.HasValue || targetUserId == notification.UserId) return;

        var userInfo = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        var commenterName = userInfo.DisplayName;
        var title = templateKey == "NewReviewEmail" ? "Yeni İnceleme!" : "Yeni Yorum!";
        var message = $"`{commenterName}` içeriğinize yeni bir yorum yaptı.";
        var url = notification.ChapterId.HasValue ? $"/read/{notification.ChapterId}" : $"/book/{notification.BookId}";

        await notificationService.SendSystemNotificationAsync(targetUserId.Value, title, message, url, ct);
        await PushRealTimeAsync(targetUserId.Value, "NotificationReceived", new { title, message, url }, ct);

        if (await preferenceProvider.CanSendEmailAsync(targetUserId.Value, prefType, ct))
        {
            var targetInfo = await userAccountProvider.GetUserBasicInfoAsync(targetUserId.Value, ct);
            var targetEmail = targetInfo.Email;
            var targetName = targetInfo.DisplayName;

            if (!string.IsNullOrEmpty(targetEmail))
            {
                var templateVariables = new Dictionary<string, string>
                {
                    { "{UserName}", targetName ?? "Kullanıcı" },
                    { "{CommenterName}", commenterName ?? "Bir Okur" },
                    { "{ActionLink}", url }
                };

                var (subject, body) = await emailTemplateService.GetRenderedEmailAsync(templateKey, templateVariables, ct);
                await notificationService.SendEmailAsync(targetEmail, subject, body, ct);
            }
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
        
        var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        if (!string.IsNullOrEmpty(email))
        {
            var templateVariables = new Dictionary<string, string>
            {
                { "{UserName}", displayName ?? "Üye" },
                { "{ActionLink}", "/author?tab=stats" },
                { "{Reason}", notification.Note ?? "Belirtilmedi" }
            };

            string templateKey = notification.IsApproved ? "AuthorApplicationApprovedEmail" : "AuthorApplicationRejectedEmail";
            var (subject, body) = await emailTemplateService.GetRenderedEmailAsync(templateKey, templateVariables, ct);
            await notificationService.SendEmailAsync(email, subject, body, ct);
        }

        if (notification.IsApproved)
        {
            await authStateService.HandlePermissionsChangedAsync(notification.UserId, "Yazarlık yetkiniz aktifleştirildi.", ct);
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

        // 📧 E-posta Bildirimi
        var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        if (!string.IsNullOrEmpty(email))
        {
            var templateVariables = new Dictionary<string, string>
            {
                { "{UserName}", displayName ?? "Üye" },
                { "{ActionLink}", "/author?tab=stats" },
                { "{Reason}", notification.Note ?? "Belirtilmedi" }
            };

            string templateKey = notification.IsApproved ? "PaidAuthorApplicationApprovedEmail" : "PaidAuthorApplicationRejectedEmail";
            var (subject, body) = await emailTemplateService.GetRenderedEmailAsync(templateKey, templateVariables, ct);
            await notificationService.SendEmailAsync(email, subject, body, ct);
        }

        if (notification.IsApproved)
        {
            await authStateService.HandlePermissionsChangedAsync(notification.UserId, "Ücretli yazarlık yetkiniz aktifleştirildi.", ct);
            await PushRealTimeAsync(notification.UserId, "RoleUpdated", new { newRole = "PaidAuthor" }, ct);
        }
    }

    public async Task Handle(InvoiceUploadedEvent notification, CancellationToken ct)
    {
        var title = "Faturanız Hazır";
        var message = "Ödemeniz için faturanız hazır. Sipariş geçmişinizden inceleyebilirsiniz.";
        var url = $"/profile/orders/{notification.OrderId}";

        await notificationService.SendSystemNotificationAsync(notification.UserId, title, message, url, ct);
        await PushRealTimeAsync(notification.UserId, "NotificationReceived", new { title, message, url }, ct);

        var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        if (!string.IsNullOrEmpty(email))
        {
            var templateVariables = new Dictionary<string, string>
            {
                { "{UserName}", displayName ?? "Üye" },
                { "{Amount}", "Görüntülemek için tıklayın" }, // TODO: Amount fetch if needed
                { "{ActionLink}", url }
            };

            var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("InvoiceCreatedEmail", templateVariables, ct);
            await notificationService.SendEmailAsync(email, subject, body, ct);
        }
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
        // 1. Kitabı takip eden aboneleri bul
        var subscribers = await libraryProvider.GetSubscribersAsync(notification.BookId, ct);
        if (subscribers == null || subscribers.Count == 0) return;

        var title = "Yeni Bölüm!";
        var message = $"`{notification.BookTitle}` kitabına yeni bir bölüm eklendi: `{notification.ChapterTitle}`";
        var url = $"/read/{notification.BookSlug}/{notification.ChapterSlug}";

        await notificationService.SendSystemNotificationBatchAsync(subscribers, title, message, url, ct);

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

        // 📧 TOPLU E-POSTA GÖNDERİMİ (Tercih Kontrolü İle)
        foreach (var subId in subscribers)
        {
            if (await preferenceProvider.CanSendEmailAsync(subId, "NewChapter", ct))
            {
                var (email, name) = await userAccountProvider.GetUserBasicInfoAsync(subId, ct);
                if (!string.IsNullOrEmpty(email))
                {
                    var templateVariables = new Dictionary<string, string>
                    {
                        { "{UserName}", name ?? "Üye" },
                        { "{BookTitle}", notification.BookTitle },
                        { "{ChapterTitle}", notification.ChapterTitle },
                        { "{ActionLink}", url }
                    };

                    var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("NewChapterEmail", templateVariables, ct);
                    await notificationService.SendEmailAsync(email, subject, body, ct);
                }
            }
        }
    }

    public async Task Handle(PasswordResetRequestedEvent notification, CancellationToken ct)
    {
        var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(notification.UserId, ct);
        
        var templateVariables = new Dictionary<string, string>
        {
            { "{UserName}", displayName ?? "Üye" },
            { "{Email}", notification.Email },
            { "{ResetToken}", notification.ResetToken },
            { "{ResetLink}", $"{{SiteUrl}}/auth/reset-password?token={notification.ResetToken}&email={notification.Email}" }
        };

        var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("PasswordReset", templateVariables, ct);
        await notificationService.SendEmailAsync(notification.Email, subject, body, ct);
    }
}

