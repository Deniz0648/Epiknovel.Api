using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using System.Security.Claims;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.LogoutAll;

[AuditLog("Tüm Oturumlardan Çıkış Yapıldı")]
public class Endpoint(
    IdentityDbContext dbContext,
    StackExchange.Redis.IConnectionMultiplexer redis) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Delete("/identity/sessions/all");
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
            // 2. TÜM AKTİF JWT'LERİ REDIS BAZLI İPTAL ET (Hardening)
            var db = redis.GetDatabase();
            foreach (var s in sessions)
            {
                if (!string.IsNullOrEmpty(s.AccessTokenJti))
                {
                    // Her cihazdaki aktif JWT'yi 60 dk boyunca kara listeye al
                    await db.StringSetAsync($"revoked_token:{s.AccessTokenJti}", "1", TimeSpan.FromMinutes(60));
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

