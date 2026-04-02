using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Users.Endpoints.UnfollowUser;

[AuditLog("Takipten Çıkıldı")]
public class Endpoint(UsersDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Delete("/users/{Identifier}/follow");
        Summary(s => {
            s.Summary = "Kullanıcıyı takip etmeyi bırakır.";
            s.Description = "Identifier (Slug veya Guid) üzerinden takibi bırakmayı sağlar. Sayaçları günceller.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var identifier = Route<string>("Identifier");
        if (string.IsNullOrWhiteSpace(identifier))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Geçersiz kullanıcı kimliği."), 400, ct);
            return;
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdString == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var followerId = Guid.Parse(userIdString);

        // Hedef kullanıcının ID'sini Identifier (Slug veya Guid) üzerinden bulalım
        Guid followingId;
        if (Guid.TryParse(identifier, out var parsedGuid))
        {
            followingId = parsedGuid;
        }
        else
        {
            followingId = await dbContext.UserProfiles
                .Where(p => p.Slug == identifier)
                .Select(p => p.UserId)
                .FirstOrDefaultAsync(ct);
        }

        if (followingId == Guid.Empty)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kullanıcı bulunamadı."), 404, ct);
            return;
        }

        // 1. Takip ilişkisini bul
        var follow = await dbContext.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId, ct);

        if (follow == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Zaten bu kullanıcıyı takip etmiyorsunuz."), 400, ct);
            return;
        }

        // 2. Profilleri bul
        var followerProfile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == followerId, ct);
        var followingProfile = await dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == followingId, ct);

        if (followerProfile == null || followingProfile == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Profil bulunamadı."), 404, ct);
            return;
        }

        // 3. Takip kaydını sil ve sayaçları düşür
        dbContext.Follows.Remove(follow);
        followerProfile.TotalFollowing = Math.Max(0, followerProfile.TotalFollowing - 1);
        followingProfile.TotalFollowers = Math.Max(0, followingProfile.TotalFollowers - 1);

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            FollowersCount = followingProfile.TotalFollowers,
            Message = $"{followingProfile.DisplayName} kullanıcısını takip etmeyi bıraktınız."
        }), 200, ct);
    }
}

