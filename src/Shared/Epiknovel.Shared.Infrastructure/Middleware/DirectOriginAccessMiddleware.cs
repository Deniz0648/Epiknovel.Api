using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Shared.Infrastructure.Middleware;

/// <summary>
/// Cloudflare bypass saldırılarını engellemek için geliştirilen güvenlik katmanı.
/// Eğer istek Cloudflare üzerinden gelmiyorsa (Secret Header yoksa) isteği reddeder.
/// </summary>
public class DirectOriginAccessMiddleware(RequestDelegate next, IConfiguration config)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var cfSecret = config["CF_PROXY_SECRET"];
        
        // Eğer secret tanımlanmamışsa (Geliştirme ortamı vb.) kontrolü pas geç
        if (string.IsNullOrEmpty(cfSecret))
        {
            await next(context);
            return;
        }

        // Cloudflare tarafından gönderilmesi beklenen özel header kontrolü
        if (!context.Request.Headers.TryGetValue("X-CF-Proxy-Secret", out var headerValue) || 
            headerValue != cfSecret)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsync("Direct origin access is not allowed. Please use the official domain.");
            return;
        }

        await next(context);
    }
}
