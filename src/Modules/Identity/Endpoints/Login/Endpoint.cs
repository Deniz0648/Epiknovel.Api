using FastEndpoints;
using FastEndpoints.Security;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Modules.Identity.Data;
using System.Security.Claims;
using MediatR;

using Epiknovel.Shared.Core.Attributes;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Identity.Endpoints.Login;

[AuditLog("Giriş Yapıldı")]
public class Endpoint(
    UserManager<User> userManager, 
    SignInManager<User> signInManager,
    IdentityDbContext dbContext,
    IConfiguration configuration) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/login");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Kullanıcı girişi yapar.";
            s.Description = "E-posta ve şifre ile JWT ve Refresh Token üretir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        
        if (user == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.InvalidEmailOrPassword), 400, ct);
            return;
        }

        // 1. Şifre Kontrolü
        var result = await signInManager.CheckPasswordSignInAsync(user, req.Password, false);

        // 2FA Koruması (Hardening)
        if (result.RequiresTwoFactor)
        {
            await Send.ResponseAsync(Result<Response>.Failure("İki faktörlü doğrulama (2FA) gereklidir."), 202, ct);
            return;
        }

        if (!result.Succeeded)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.InvalidEmailOrPassword), 400, ct);
            return;
        }

        // 2. Kullanıcı Rollerini Getir
        var roles = await userManager.GetRolesAsync(user);

        // 3. Access Token (JWT) Üretimi + JTI (Blacklisting için)
        var jti = Guid.NewGuid().ToString();
        var expiryDate = DateTime.UtcNow.AddMinutes(15);
        var jwtToken = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = configuration["Jwt:Secret"]!;
            o.ExpireAt = expiryDate;
            o.User.Claims.Add(new("sub", user.Id.ToString()));
            o.User.Claims.Add(new("email", user.Email!));
            o.User.Claims.Add(new(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti, jti));
            foreach (var role in roles)
            {
                o.User.Claims.Add(new(ClaimTypes.Role, role));
            }
        });

        // 4. Refresh Token Üretimi ve Kaydı
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
            AccessToken = jwtToken,
            RefreshToken = refreshToken,
            ExpiryDate = expiryDate
        }), 200, ct);
    }
}

