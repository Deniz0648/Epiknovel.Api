using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Modules.Infrastructure.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Services;

namespace Epiknovel.Modules.Infrastructure.Services;

public class NotificationService(InfrastructureDbContext dbContext, IEmailService emailService) : INotificationService
{
    public async Task SendEmailAsync(string email, string subject, string message, CancellationToken ct = default)
    {
        // Gerçekte Email servisine (SMTP/SendGrid/Amazon SES) delegasyon yapar
        await emailService.SendEmailAsync(email, subject, message);
    }

    public async Task SendSystemNotificationAsync(Guid userId, string title, string message, string? actionUrl, CancellationToken ct = default)
    {
        // Uygulama içi (In-App) bildirim için Veritabanına kaydet
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            ActionUrl = actionUrl,
            Type = NotificationType.Info,
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        dbContext.Notifications.Add(notification);
        await dbContext.SaveChangesAsync(ct);
        
        // TODO: Real-time (SignalR) push notification can be added here
    }
}
