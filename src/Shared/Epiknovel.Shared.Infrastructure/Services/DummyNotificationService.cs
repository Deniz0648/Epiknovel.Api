using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Shared.Infrastructure.Services;

public class DummyNotificationService : INotificationService
{
    public Task SendEmailAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        Console.WriteLine($"[EMAIL] To: {toEmail} | Subject: {subject}");
        return Task.CompletedTask;
    }

    public Task SendSystemNotificationAsync(Guid userId, string title, string message, string? link = null, CancellationToken ct = default)
    {
        Console.WriteLine($"[NOTIFICATION] User: {userId} | Title: {title} | Link: {link}");
        return Task.CompletedTask;
    }

    public Task SendSystemNotificationBatchAsync(IEnumerable<Guid> userIds, string title, string message, string? link = null, CancellationToken ct = default)
    {
        Console.WriteLine($"[BATCH_NOTIFICATION] Count: {userIds.Count()} | Title: {title}");
        return Task.CompletedTask;
    }

    public Task BroadcastCommentAsync(Guid userId, Guid? bookId, Guid? chapterId, string? paragraphId, CancellationToken ct = default)
    {
        Console.WriteLine($"[BROADCAST] User: {userId} | Book: {bookId} | Chapter: {chapterId} | Paragraph: {paragraphId}");
        return Task.CompletedTask;
    }
}
