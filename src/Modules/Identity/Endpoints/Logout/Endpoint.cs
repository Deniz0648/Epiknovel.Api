using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Distributed;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.Logout;

[AuditLog("Çıkış Yapıldı")]
public class Endpoint(
    IdentityDbContext dbContext, 
    IDistributedCache cache) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/logout");
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

        // 1. JWT Blacklisting (IDistributedCache ile standartlaştırma)
        var jti = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti) ?? User.FindFirstValue("jti");
        if (!string.IsNullOrEmpty(jti))
        {
            // Middleware ile aynı kuralı uyguluyoruz
            await cache.SetStringAsync($"revoked_token:{jti}", "1", new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60)
            }, ct);
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

