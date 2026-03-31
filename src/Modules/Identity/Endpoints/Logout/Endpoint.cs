using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using System.Security.Claims;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.Logout;

[AuditLog("Çıkış Yapıldı")]
public class Endpoint(
    IdentityDbContext dbContext, 
    StackExchange.Redis.IConnectionMultiplexer redis) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/logout");
        Summary(s => {
            s.Summary = "Mevcut oturumdan çıkış yapar.";
            s.Description = "Refresh Token'ı siler ve aktif JWT'yi (JTI bazlı) kara listeye alır.";
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

        var userId = Guid.Parse(userIdString);

        // 1. JWT Blacklisting (Hardening)
        // JWT içindeki JTI'yı al ve Redis'te kara listeye ekle
        var jti = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti);
        if (!string.IsNullOrEmpty(jti))
        {
            var db = redis.GetDatabase();
            // JWT 60 dk geçerli olduğu için 60 dk blacklist yeterli
            await db.StringSetAsync($"revoked_token:{jti}", "1", TimeSpan.FromMinutes(60));
        }

        // 2. Refresh Token'ı bul ve sil
        var session = await dbContext.UserSessions
            .FirstOrDefaultAsync(x => x.RefreshToken == req.RefreshToken && x.UserId == userId, ct);

        if (session != null)
        {
            dbContext.UserSessions.Remove(session);
            await dbContext.SaveChangesAsync(ct);
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.LoggedOutSuccessfully
        }), 200, ct);
    }
}

