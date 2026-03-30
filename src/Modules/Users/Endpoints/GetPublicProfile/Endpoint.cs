using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
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
        // 1. Profil kaydını bul (Slug üzerinden) - Performans: İzleme Kapalı (ReadOnly)
        var profile = await dbContext.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == req.Slug, ct);

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
            DisplayName = profile.DisplayName,
            Bio = profile.Bio,
            FollowersCount = profile.TotalFollowers,
            FollowingCount = profile.TotalFollowing,
            IsFollowing = isFollowing,
            AvatarUrl = string.IsNullOrEmpty(profile.AvatarUrl) 
                ? null 
                : fileService.GetFileUrl(profile.AvatarUrl, "profiles")
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}

