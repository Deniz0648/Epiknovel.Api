using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Common;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.GetMyProfile;

public class Endpoint(
    UsersDbContext dbContext,
    IFileService fileService,
    IUserAccountProvider userAccountProvider) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/users/me");
        Policies("BOLA"); // BOLA politikasını (RequireAuthenticatedUser) zorunlu kılıyoruz
        Summary(s => {
            s.Summary = "Oturum açmış kullanıcının profil detaylarını getirir.";
            s.Description = "Görsel URL'i merkezi IFileService üzerinden tam adres olarak döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        Console.WriteLine($"[GET_MY_PROFILE] Endpoint tetiklendi! Authenticated: {User.Identity?.IsAuthenticated}");
        foreach (var claim in User.Claims)
        {
            Console.WriteLine($"[CLAIM] Type: {claim.Type} | Value: {claim.Value}");
        }
        Console.Out.Flush();

        var userIdString = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdString == null)
        {
            Console.WriteLine("[GET_MY_PROFILE] 401: Kullanıcı ID bulunamadı (Sub / NameIdentifier eşleşmedi).");
            await Send.ResponseAsync(Result<Response>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var userId = Guid.Parse(userIdString);
        var displayName = ResolveDisplayName(User.Identity?.Name);

        // 1. Profil kaydını bul
        var profile = await dbContext.UserProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId, ct);

        // 1.1 SELF-HEALING: Eğer giriş yapmış ama profili yoksa (Event kaçmış olabilir), hemen oluştur.
        if (profile == null)
        {
            Console.WriteLine($"[GET_MY_PROFILE] Profil bulunamadı! Otomatik oluşturuluyor... UserID: {userId}");
            
            profile = new UserProfile
            {
                UserId = userId,
                DisplayName = displayName,
                Slug = SlugHelper.ToSlug(displayName),
                Bio = "Merhaba! Epiknovel'e hoş geldim.",
                TotalFollowers = 0,
                TotalFollowing = 0
            };

            if (string.IsNullOrWhiteSpace(profile.Slug))
            {
                profile.Slug = "okur";
            }

            // Slug çakışması kontrolü
            var baseSlug = profile.Slug;
            var suffix = 1;
            while (await dbContext.UserProfiles.AnyAsync(x => x.Slug == profile.Slug, ct))
            {
                profile.Slug = $"{baseSlug}-{suffix++}";
            }

            dbContext.UserProfiles.Add(profile);
            await dbContext.SaveChangesAsync(ct);
            Console.WriteLine($"[GET_MY_PROFILE] Profil başarıyla otomatik oluşturuldu. Slug: {profile.Slug}");
            Console.Out.Flush();
        }

        // 2. Yanıtı hazırla (AvatarUrl'i tam URL'e çeviriyoruz)
        var response = new Response
        {
            UserId = profile.UserId,
            DisplayName = profile.DisplayName,
            Bio = profile.Bio,
            FollowersCount = profile.TotalFollowers,
            FollowingCount = profile.TotalFollowing,
            EmailConfirmed = await userAccountProvider.IsEmailConfirmedAsync(profile.UserId, ct),
            AvatarUrl = string.IsNullOrEmpty(profile.AvatarUrl) 
                ? null 
                : fileService.GetFileUrl(profile.AvatarUrl, "profiles")
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }

    private static string ResolveDisplayName(string? identityName)
    {
        if (!string.IsNullOrWhiteSpace(identityName))
        {
            return identityName.Trim();
        }

        return "Okur";
    }
}
