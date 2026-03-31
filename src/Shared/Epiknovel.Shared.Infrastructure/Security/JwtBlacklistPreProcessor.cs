using FastEndpoints;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using StackExchange.Redis;

namespace Epiknovel.Shared.Infrastructure.Security;

/// <summary>
/// Çıkış yapmış (Logout) kullanıcıların JWT tokenlarını (JTI bazlı) 
/// Redis üzerinden kontrol ederek geçersiz kılan güvenlik katmanı.
/// </summary>
public class JwtBlacklistPreProcessor(IConnectionMultiplexer redis) : IGlobalPreProcessor
{
    public async Task PreProcessAsync(IPreProcessorContext context, CancellationToken ct)
    {
        // 1. Kullanıcı giriş yapmış mı?
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
        {
            return;
        }

        // 2. JWT içindeki benzersiz JTI'yı al
        var jti = context.HttpContext.User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti);
        
        if (string.IsNullOrEmpty(jti))
        {
            return;
        }

        // 3. Redis'te kara liste kontrolü yap
        var db = redis.GetDatabase();
        // Backward compatibility: eski ve yeni blacklist anahtarlarini birlikte kontrol et.
        var isBlacklisted =
            await db.KeyExistsAsync($"revoked_token:{jti}") ||
            await db.KeyExistsAsync($"jwt:blacklist:{jti}");

        if (isBlacklisted)
        {
            // Eğer kara listedeyse (Logout yapılmışsa) 401 dön ve işlemi durdur
            await context.HttpContext.Response.SendAsync(new { Message = "Oturumunuz sonlandırılmış. Lütfen tekrar giriş yapın." }, 401, cancellation: ct);
            return;
        }
    }
}
