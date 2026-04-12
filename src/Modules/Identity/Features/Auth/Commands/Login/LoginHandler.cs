using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
using FastEndpoints.Security;
using MediatR;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Epiknovel.Modules.Identity.Features.Auth.Commands.Login;

public class LoginHandler(
    UserManager<User> userManager,
    SignInManager<User> signInManager,
    IdentityDbContext dbContext,
    IConfiguration configuration,
    IUserProvider userProvider) : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        
        if (user == null)
        {
            return Result<LoginResponse>.Failure(ApiMessages.InvalidEmailOrPassword);
        }

        // 0. Manual Ban Check
        var isPermanentlyLocked = user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow.AddYears(10);
        if (user.IsBanned || isPermanentlyLocked)
        {
            var banMessage = !string.IsNullOrWhiteSpace(user.BanReason)
                ? $"Hesabınız yasaklanmıştır. Sebep: {user.BanReason}"
                : "Hesabınız kuralları ihlal ettiğiniz için süresiz olarak uzaklaştırılmıştır.";
            return Result<LoginResponse>.Failure(banMessage);
        }

        // 1. Password check with lockout
        var signInResult = await signInManager.CheckPasswordSignInAsync(user, request.Password, true);

        if (signInResult.IsLockedOut)
        {
            return Result<LoginResponse>.Failure("Hesabınız çok sayıda hatalı giriş denemesi nedeniyle geçici olarak kilitlenmiştir. Lütfen 15 dakika sonra tekrar deneyin.");
        }

        if (!signInResult.Succeeded)
        {
            return Result<LoginResponse>.Failure(ApiMessages.InvalidEmailOrPassword);
        }

        // 2. Fetch Profile from Users Module via Provider
        var profileResult = await userProvider.GetProfileAsync(user.Id, user.Email, ct);
        
        if (!profileResult.IsSuccess)
        {
             return Result<LoginResponse>.Failure("Profil bilgileri alınamadı.");
        }

        // 3. Fetch Roles
        var roles = await userManager.GetRolesAsync(user);

        // 4. Generate Access Token (JWT) + JTI
        var jti = Guid.NewGuid().ToString();
        var expiryDate = DateTime.UtcNow.AddMinutes(60);
        
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? configuration["JWT_SECRET"];

        var jwtToken = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = jwtSecret!;
            o.ExpireAt = expiryDate;
            o.User.Claims.Add(new(ClaimTypes.NameIdentifier, user.Id.ToString()));
            o.User.Claims.Add(new(ClaimTypes.Email, user.Email!));
            o.User.Claims.Add(new("sub", user.Id.ToString()));
            o.User.Claims.Add(new(JwtRegisteredClaimNames.Jti, jti));
            foreach (var role in roles)
            {
                o.User.Claims.Add(new(ClaimTypes.Role, role));
            }
        });

        // 5. Generate & Save Refresh Token
        var refreshToken = Guid.NewGuid().ToString("N");
        var session = new UserSession
        {
            UserId = user.Id,
            RefreshToken = refreshToken,
            AccessTokenJti = jti,
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            IpAddress = request.IpAddress,
            UserAgent = request.UserAgent
        };

        dbContext.UserSessions.Add(session);
        await dbContext.SaveChangesAsync(ct);

        return Result<LoginResponse>.Success(new LoginResponse(jwtToken, refreshToken, expiryDate, profileResult.Data!));
    }
}
