using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Users.Endpoints.FollowUser;

[AuditLog("Kullanıcı Takip Edildi")]
public class Endpoint(UsersDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/users/{FollowingId}/follow");
        Summary(s => {
            s.Summary = "Bir kullanıcıyı takip eder.";
            s.Description = "Takipçi sayılarını anlık (atomic) günceller ve mükerrer takibi engeller.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdString == null)
        {
            await Send.UnauthorizedAsync(ct);
            return;
        }

        var followerId = Guid.Parse(userIdString);

        // 1. Kendi kendini takip etme engeli
        if (followerId == req.FollowingId)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kendinizi takip edemezsiniz."), 400, ct);
            return;
        }

        // 2. Takip kaydı oluştur (Unique Index sayesinde mükerrer kayıt SQL hatası verecektir)
        var follow = new Follow
        {
            FollowerId = followerId,
            FollowingId = req.FollowingId
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
            .Where(p => p.UserId == req.FollowingId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.TotalFollowers, b => b.TotalFollowers + 1), ct);

        // Güncel takipçi sayısını getir (Yanıtta göstermek için)
        var finalFollowerCount = await dbContext.UserProfiles
            .Where(p => p.UserId == req.FollowingId)
            .Select(p => p.TotalFollowers)
            .FirstOrDefaultAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            FollowersCount = finalFollowerCount,
            Message = "Takip başarıyla başlatıldı."
        }), 200, ct);
    }
}

