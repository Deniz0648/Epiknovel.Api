using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Distributed;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.LogoutAll;

[AuditLog("Tüm Oturumlardan Çıkış Yapıldı")]
public class Endpoint(
    IdentityDbContext dbContext,
    IDistributedCache cache) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Delete("/auth/sessions/all");
        Summary(s => {
            s.Summary = "Tüm cihazlardan çıkış yapar.";
            s.Description = "Kullanıcıya ait tüm aktif Refresh Token'ları siler ve aktif JWT'leri kara listeye alır.";
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

        // 1. Kullanıcıya ait tüm session'ları bul
        var sessions = await dbContext.UserSessions
            .Where(x => x.UserId == userId)
            .ToListAsync(ct);

        if (sessions.Any())
        {
            // 2. TÜM AKTİF JWT'LERİ REDIS BAZLI İPTAL ET (IDistributedCache uyumu için)
            foreach (var s in sessions)
            {
                if (!string.IsNullOrEmpty(s.AccessTokenJti))
                {
                    // Middleware ile aynı key formatını ve IDistributedCache'i kullanıyoruz
                    await cache.SetStringAsync($"revoked_token:{s.AccessTokenJti}", "1", new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60)
                    }, ct);
                }
            }

            dbContext.UserSessions.RemoveRange(sessions);
            await dbContext.SaveChangesAsync(ct);
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.AllSessionsRevokedSuccessfully
        }), 200, ct);
    }
}

