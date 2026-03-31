using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Common;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.GetPublicProfile;

public class Endpoint(UsersDbContext dbContext, IFileService fileService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/users/{Slug}");
        AllowAnonymous();
        ResponseCache(60); // 1 Dakika Önbellekle (Hızlı yanıt)
        Summary(s => {
            s.Summary = "Bir kullanıcının halka açık profilini getirir.";
            s.Description = "Slug üzerinden erişim sağlar, IsFollowing durumunu döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var normalizedSlug = SlugHelper.ToSlug(req.Slug);
        if (string.IsNullOrWhiteSpace(normalizedSlug))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Profil bulunamadı."), 404, ct);
            return;
        }

        // 1. Profil kaydını bul (Slug üzerinden) - Performans: İzleme Kapalı (ReadOnly)
        var profile = await dbContext.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == normalizedSlug, ct);

        var isRedirected = false;

        if (profile == null)
        {
            var legacyUserId = await dbContext.UserSlugHistories
                .AsNoTracking()
                .Where(x => x.Slug == normalizedSlug)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => (Guid?)x.UserId)
                .FirstOrDefaultAsync(ct);

            if (legacyUserId.HasValue)
            {
                profile = await dbContext.UserProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.UserId == legacyUserId.Value, ct);

                isRedirected = profile != null;
            }
        }

        if (profile == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Profil bulunamadı."), 404, ct);
            return;
        }

        // 2. İlişki Durumu: İstek atan kullanıcı bu hesabı takip ediyor mu?
        bool isFollowing = false;
        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(currentUserIdStr) && Guid.TryParse(currentUserIdStr, out var currentUserId))
        {
            isFollowing = await dbContext.Follows
                .AnyAsync(f => f.FollowerId == currentUserId && f.FollowingId == profile.UserId, ct);
        }

        // 3. Yanıtı hazırla (Halka açık verilerle)
        var response = new Response
        {
            Slug = profile.Slug,
            DisplayName = profile.DisplayName,
            Bio = profile.Bio,
            FollowersCount = profile.TotalFollowers,
            FollowingCount = profile.TotalFollowing,
            IsFollowing = isFollowing,
            IsAuthor = profile.IsAuthor,
            IsRedirected = isRedirected,
            AvatarUrl = string.IsNullOrEmpty(profile.AvatarUrl) 
                ? null 
                : fileService.GetFileUrl(profile.AvatarUrl, "profiles")
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}

