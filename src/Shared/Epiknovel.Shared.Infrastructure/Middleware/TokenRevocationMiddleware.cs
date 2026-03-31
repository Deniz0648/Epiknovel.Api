using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using System.Security.Claims;
using System.Net;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Shared.Infrastructure.Middleware;

/// <summary>
/// Her istekte JWT'nin JTI bilgisini Redis üzerinden kontrol eder.
/// Eğer token iptal edilmişse (Logout/Revoke), 401 Unauthorized döner.
/// </summary>
public class TokenRevocationMiddleware(RequestDelegate next, IDistributedCache cache)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Kullanıcı doğrulanmışsa kontrol et
        if (context.User.Identity?.IsAuthenticated == true)
        {
            // JWT içindeki benzersiz JTI'yı al
            var jti = context.User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti) 
                      ?? context.User.FindFirstValue("jti");

            if (!string.IsNullOrEmpty(jti))
            {
                // Redis'ten kontrol et
                var isRevoked =
                    await cache.GetStringAsync($"revoked_token:{jti}") ??
                    await cache.GetStringAsync($"jwt:blacklist:{jti}");
                
                if (!string.IsNullOrEmpty(isRevoked))
                {
                    Console.WriteLine($"[AUTH_REVOKED] JTI: {jti} blocked by Redis Blacklist.");
                    
                    context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                    context.Response.ContentType = "application/json";
                    
                    var response = Result<object>.Failure("Oturumunuz sonlandırılmış veya geçersiz kılınmış. Lütfen tekrar giriş yapın.");
                    await context.Response.WriteAsJsonAsync(response);
                    return;
                }
            }
        }

        await next(context);
    }
}
