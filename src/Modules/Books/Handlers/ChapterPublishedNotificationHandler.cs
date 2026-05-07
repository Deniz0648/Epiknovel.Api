using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Interfaces.Users;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Books.Handlers;

public class ChapterPublishedNotificationHandler(
    INotificationService notificationService,
    ILibraryProvider libraryProvider,
    IUserAccountProvider userAccountProvider,
    INotificationPreferenceProvider preferenceProvider,
    ILogger<ChapterPublishedNotificationHandler> logger) : INotificationHandler<ChapterPublishedEvent>
{
    public async Task Handle(ChapterPublishedEvent notification, CancellationToken ct)
    {
        try
        {
            // 1. Kitaba abone olan kullanıcıları getir
            var subscriberIds = await libraryProvider.GetSubscribersAsync(notification.BookId, ct);
            if (subscriberIds == null || subscriberIds.Count == 0) return;

            var actionLink = $"/read/{notification.BookSlug}/{notification.ChapterSlug}";

            foreach (var userId in subscriberIds)
            {
                // Yazara kendi bölümü için mail atma (opsiyonel, genelde atılmaz)
                if (userId == notification.UserId) continue;


                await notificationService.SendSystemNotificationAsync(
                    userId,
                    "Yeni Bölüm Yayınlandı!",
                    $"{notification.BookTitle} kitabına '{notification.ChapterTitle}' isimli yeni bir bölüm eklendi.",
                    actionLink,
                    ct);


                if (await preferenceProvider.CanSendEmailAsync(userId, NotificationTypes.NewChapter, ct))
                {
                    var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(userId, ct);
                    if (!string.IsNullOrEmpty(email))
                    {
                        await notificationService.SendTemplatedEmailAsync(email, "NewChapterEmail", new Dictionary<string, string>
                        {
                            { "UserName", displayName ?? email },
                            { "BookTitle", notification.BookTitle },
                            { "ChapterTitle", notification.ChapterTitle },
                            { "ActionLink", actionLink }
                        }, ct);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Chapter published notification process failed for ChapterId: {ChapterId}", notification.ChapterId);
        }
    }
}
