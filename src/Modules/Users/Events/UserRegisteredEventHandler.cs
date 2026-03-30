using MediatR;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Common;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Users.Events;

public class UserRegisteredEventHandler(UsersDbContext dbContext) : INotificationHandler<UserRegisteredEvent>
{
    public async Task Handle(UserRegisteredEvent notification, CancellationToken ct)
    {
        // 1. Temel Slug Üretimi
        var baseSlug = SlugHelper.ToSlug(notification.DisplayName);
        var slug = baseSlug;
        var suffix = 1;

        // 2. Uniqueness Logic: Çakışma varsa sonuna ek getir
        while (await dbContext.UserProfiles.AnyAsync(x => x.Slug == slug, ct))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        // 3. Yeni bir kullanıcı profili oluşturuyoruz
        var profile = new UserProfile
        {
            UserId = notification.UserId,
            DisplayName = notification.DisplayName,
            Slug = slug,
            Bio = "Yeni okur/yazar merhaba diyor!",
            TotalFollowers = 0,
            TotalFollowing = 0
        };

        dbContext.UserProfiles.Add(profile);
        await dbContext.SaveChangesAsync(ct);
    }
}
