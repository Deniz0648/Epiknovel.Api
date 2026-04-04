namespace Epiknovel.Shared.Core.Interfaces;

public interface INotificationService
{
    Task SendEmailAsync(string toEmail, string subject, string body, CancellationToken ct = default);
    Task SendSystemNotificationAsync(Guid userId, string title, string message, string? link = null, CancellationToken ct = default);
    Task SendSystemNotificationBatchAsync(IEnumerable<Guid> userIds, string title, string message, string? link = null, CancellationToken ct = default);
}
