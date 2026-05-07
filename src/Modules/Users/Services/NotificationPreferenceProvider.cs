using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces.Users;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Users.Services;

public class NotificationPreferenceProvider(UsersDbContext dbContext) : INotificationPreferenceProvider
{
    public async Task<bool> CanSendEmailAsync(Guid userId, string notificationType, CancellationToken ct = default)
    {
        var pref = await dbContext.NotificationPreferences
            .Where(p => p.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (pref == null) return true; // Varsayılan olarak açık

        return notificationType switch
        {
            NotificationTypes.NewChapter => pref.EmailOnNewChapter,
            NotificationTypes.NewReview => pref.EmailOnNewReview,
            NotificationTypes.NewComment => pref.EmailOnNewComment,
            _ => true
        };
    }

    public async Task<bool> CanSendPushAsync(Guid userId, string notificationType, CancellationToken ct = default)
    {
        var pref = await dbContext.NotificationPreferences
            .Where(p => p.UserId == userId)
            .FirstOrDefaultAsync(ct);

        if (pref == null) return true;

        return notificationType switch
        {
            NotificationTypes.NewChapter => pref.PushOnNewChapter,
            NotificationTypes.NewReview => pref.PushOnNewReview,
            NotificationTypes.NewComment => pref.PushOnNewComment,
            _ => true
        };
    }
}
