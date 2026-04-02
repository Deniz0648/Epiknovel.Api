using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Attributes;

using FastEndpoints.Security;
using Epiknovel.Modules.Identity.Data;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;

namespace Epiknovel.Modules.Identity.Endpoints.ConfirmEmail;

[AuditLog("E-posta Onaylandı")]
public class Endpoint(
    UserManager<User> userManager, 
    IdentityDbContext dbContext,
    IConfiguration configuration) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/confirm-email");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "E-posta adresini onaylar.";
            s.Description = "Doğrulama anahtarı ile hesabı aktif eder ve başarılı olursa otomatik giriş (Token) sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(req.UserId.ToString());

        if (user == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.UserNotFound), 404, ct);
            return;
        }

        var result = await userManager.ConfirmEmailAsync(user, req.Token);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
            return;
        }

        // --- OKUYUCU İSTEĞİ: Onay sonrası otomatik oturum açma (Token Üretimi) ---
        
        // 1. Kullanıcı Rollerini Getir
        var roles = await userManager.GetRolesAsync(user);

        // 2. Access Token (JWT) Üretimi
        var jti = Guid.NewGuid().ToString();
        var expiryDate = DateTime.UtcNow.AddMinutes(60);

        var jwtToken = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = Environment.GetEnvironmentVariable("JWT_SECRET") ?? configuration["JWT_SECRET"] ?? configuration["Jwt:Secret"]!;
            o.ExpireAt = expiryDate;
            o.User.Claims.Add(new(ClaimTypes.NameIdentifier, user.Id.ToString()));
            o.User.Claims.Add(new(ClaimTypes.Email, user.Email!));
            o.User.Claims.Add(new(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti, jti));
            foreach (var role in roles)
            {
                o.User.Claims.Add(new(ClaimTypes.Role, role));
            }
        });

        // 3. Refresh Token Üretimi ve Kaydı
        var refreshToken = Guid.NewGuid().ToString("N");
        var session = new UserSession
        {
            UserId = user.Id,
            RefreshToken = refreshToken,
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent = HttpContext.Request.Headers.UserAgent.ToString()
        };

        dbContext.UserSessions.Add(session);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "E-postanız başarıyla onaylandı. Oturumunuz açıldı, yönlendiriliyorsunuz...",
            AccessToken = jwtToken,
            RefreshToken = refreshToken
        }), 200, ct);
    }
}

