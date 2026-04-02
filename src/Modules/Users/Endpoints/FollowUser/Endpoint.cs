using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Users.Endpoints.FollowUser;

[AuditLog("Kullanıcı Takip Edildi")]
public class Endpoint(UsersDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Post("/users/{Identifier}/follow");
        Summary(s => {
            s.Summary = "Bir kullanıcıyı takip eder.";
            s.Description = "Identifier (Slug veya Guid) üzerinden kullanıcıyı takip etmeyi sağlar. Takipçi sayılarını anlık günceller.";
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
            await Send.UnauthorizedAsync(ct);
            return;
        }

        var followerId = Guid.Parse(userIdString);

        bool isGuid = Guid.TryParse(identifier, out var parsedGuid);

        // Hedef kullanıcının profilini getirelim
        var targetProfile = await dbContext.UserProfiles
            .AsNoTracking()
            .Where(p => (isGuid && p.UserId == parsedGuid) || p.Slug == identifier)
            .Select(p => new { p.UserId, p.IsAuthor, p.DisplayName })
            .FirstOrDefaultAsync(ct);

        if (targetProfile == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Takip edilecek kullanıcı bulunamadı."), 404, ct);
            return;
        }

        // 0. Sadece Yazarlar Takip Edilebilir Kuralı
        if (!targetProfile.IsAuthor)
        {
            await Send.ResponseAsync(Result<Response>.Failure($"Üzgünüz, {targetProfile.DisplayName} bir yazar olmadığı için takip edilemez."), 400, ct);
            return;
        }

        var followingId = targetProfile.UserId;

        // 1. Kendi kendini takip etme engeli
        if (followerId == followingId)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kendinizi takip edemezsiniz."), 400, ct);
            return;
        }

        // 2. Takip kaydı oluştur (Unique Index sayesinde mükerrer kayıt SQL hatası verecektir)
        var follow = new Follow
        {
            FollowerId = followerId,
            FollowingId = followingId
        };

        try 
        {
            dbContext.Follows.Add(follow);
            await dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Unique constraint ihlali (Zaten takip ediyor)
            await Send.ResponseAsync(Result<Response>.Failure("Bu kullanıcıyı zaten takip ediyorsunuz."), 400, ct);
            return;
        }

        // 3. Sayaçları Atomic (Race Condition Protection) olarak artır
        // ExecuteUpdateAsync ile atomik SQL UPDATE (FollowersCount = FollowersCount + 1)
        await dbContext.UserProfiles
            .Where(p => p.UserId == followerId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.TotalFollowing, b => b.TotalFollowing + 1), ct);

        await dbContext.UserProfiles
            .Where(p => p.UserId == followingId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.TotalFollowers, b => b.TotalFollowers + 1), ct);

        // Güncel takipçi sayısını getir (Yanıtta göstermek için)
        var finalFollowerCount = await dbContext.UserProfiles
            .Where(p => p.UserId == followingId)
            .Select(p => p.TotalFollowers)
            .FirstOrDefaultAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            FollowersCount = finalFollowerCount,
            Message = "Takip başarıyla başlatıldı."
        }), 200, ct);
    }
}

