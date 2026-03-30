using FastEndpoints;
using FastEndpoints.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Modules.Identity.Data;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Identity.Endpoints.RefreshToken;

public class Endpoint(
    UserManager<User> userManager, 
    IConfiguration configuration,
    IdentityDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/refresh-token");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Access Token'ı yeniler.";
            s.Description = "Geçerli bir Refresh Token ile yeni bir JWT ve yeni bir Refresh Token üretir (Rotation).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Refresh Token'ı veritabanında ara
        var session = await dbContext.UserSessions
            .FirstOrDefaultAsync(x => x.RefreshToken == req.RefreshToken, ct);

        if (session == null || session.ExpiryDate < DateTime.UtcNow)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.InvalidOrExpiredSession), 401, ct);
            return;
        }

        var user = await userManager.FindByIdAsync(session.UserId.ToString());
        if (user == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.UserNotFound), 401, ct);
            return;
        }

        // 2. Token Rotaion: Eski session'ı sil ve yenisini oluştur
        dbContext.UserSessions.Remove(session);
        
        var newRefreshToken = Guid.NewGuid().ToString("N");
        var newExpiryDate = DateTime.UtcNow.AddMinutes(15);
        var newSession = new UserSession
        {
            UserId = user.Id,
            RefreshToken = newRefreshToken,
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent = HttpContext.Request.Headers.UserAgent.ToString()
        };

        dbContext.UserSessions.Add(newSession);
        await dbContext.SaveChangesAsync(ct);

        // 3. Yeni JWT Üretimi
        var jwtToken = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = configuration["Jwt:Secret"]!;
            o.ExpireAt = newExpiryDate;
            o.User.Claims.Add(new("sub", user.Id.ToString()));
            o.User.Claims.Add(new("email", user.Email!));
        });

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            AccessToken = jwtToken,
            RefreshToken = newRefreshToken,
            ExpiryDate = newExpiryDate
        }), 200, ct);
    }
}

