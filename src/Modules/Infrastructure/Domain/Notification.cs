using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Infrastructure.Domain;

public enum NotificationType
{
    Info,
    Success,
    Warning,
    Error,
    NewChapter,
    NewComment,
    NewReview
}

public class Notification : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    
    public NotificationType Type { get; set; } = NotificationType.Info;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}
