using FastEndpoints;
using FastEndpoints.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Modules.Identity.Data;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;

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
        await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);

        // 1. Refresh Token'ı veritabanında ara
        var session = await dbContext.UserSessions
            .AsNoTracking()
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

        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow)
        {
            await dbContext.UserSessions
                .Where(x => x.Id == session.Id)
                .ExecuteDeleteAsync(ct);
            await transaction.CommitAsync(ct);
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.Identity.UserBanned), 403, ct);
            return;
        }

        // 2. Token Rotation: Eski session'ı sil ve yenisini oluştur
        var jti = Guid.NewGuid().ToString(); // JTI'yı şimdi üretiyoruz ki session'a kaydedelim
        var deletedRows = await dbContext.UserSessions
            .Where(x => x.Id == session.Id && x.RefreshToken == req.RefreshToken)
            .ExecuteDeleteAsync(ct);

        if (deletedRows == 0)
        {
            await transaction.RollbackAsync(ct);
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.InvalidOrExpiredSession), 401, ct);
            return;
        }
        
        var newRefreshToken = Guid.NewGuid().ToString("N");
        var newSession = new UserSession
        {
            UserId = user.Id,
            RefreshToken = newRefreshToken,
            AccessTokenJti = jti, // Yeni JWT'yi kaydediyoruz
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent = HttpContext.Request.Headers.UserAgent.ToString()
        };

        dbContext.UserSessions.Add(newSession);
        await dbContext.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        // 3. Yeni JWT Üretimi (Roller Dahil!)
        var roles = await userManager.GetRolesAsync(user);
        var expiryDate = DateTime.UtcNow.AddMinutes(60);
        
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? configuration["JWT_SECRET"]
            ?? throw new InvalidOperationException("CRITICAL: JWT_SECRET environment variable is missing!");

        var jwtToken = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = jwtSecret;
            o.ExpireAt = expiryDate;
            o.User.Claims.Add(new(ClaimTypes.NameIdentifier, user.Id.ToString()));
            o.User.Claims.Add(new(ClaimTypes.Email, user.Email!));
            o.User.Claims.Add(new(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti, jti));
            foreach (var role in roles)
            {
                o.User.Claims.Add(new(ClaimTypes.Role, role));
            }
        });

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            AccessToken = jwtToken,
            RefreshToken = newRefreshToken,
            ExpiryDate = expiryDate
        }), 200, ct);
    }
}

