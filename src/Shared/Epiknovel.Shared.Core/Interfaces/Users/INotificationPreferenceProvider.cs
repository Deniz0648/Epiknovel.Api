namespace Epiknovel.Shared.Core.Interfaces.Users;

public interface INotificationPreferenceProvider
{
    Task<bool> CanSendEmailAsync(Guid userId, string notificationType, CancellationToken ct = default);
    Task<bool> CanSendPushAsync(Guid userId, string notificationType, CancellationToken ct = default);
}

public static class NotificationTypes
{
    public const string NewChapter = "NewChapter";
    public const string NewReview = "NewReview";
    public const string NewComment = "NewComment";
}
