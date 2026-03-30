using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.GetMyProfile;

public class Endpoint(UsersDbContext dbContext, IFileService fileService) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/users/me");
        Summary(s => {
            s.Summary = "Oturum açmış kullanıcının profil detaylarını getirir.";
            s.Description = "Görsel URL'i merkezi IFileService üzerinden tam adres olarak döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdString == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var userId = Guid.Parse(userIdString);

        // 1. Profil kaydını bul
        var profile = await dbContext.UserProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId, ct);

        if (profile == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Profil bulunamadı."), 404, ct);
            return;
        }

        // 2. Yanıtı hazırla (AvatarUrl'i tam URL'e çeviriyoruz)
        var response = new Response
        {
            UserId = profile.UserId,
            DisplayName = profile.DisplayName,
            Bio = profile.Bio,
            FollowersCount = profile.TotalFollowers,
            FollowingCount = profile.TotalFollowing,
            AvatarUrl = string.IsNullOrEmpty(profile.AvatarUrl) 
                ? null 
                : fileService.GetFileUrl(profile.AvatarUrl, "profiles")
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}

