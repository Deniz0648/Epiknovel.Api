using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using Epiknovel.Shared.Core.Attributes;
using System.Text.Json;
using System.IO;

namespace Epiknovel.Shared.Infrastructure.Middleware;

/// <summary>
/// X-Idempotency-Key başlığına göre aynı isteğin mükerrer işlenmesini engeller ve eski sonucu döner.
/// </summary>
public class IdempotencyMiddleware(RequestDelegate next, IDistributedCache cache)
{
    private const string IdempotencyHeader = "X-Idempotency-Key";

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Endpoint'te [Idempotency] niteliği var mı?
        var endpoint = context.GetEndpoint();
        var attribute = endpoint?.Metadata.GetMetadata<IdempotencyAttribute>();

        if (attribute == null)
        {
            await next(context);
            return;
        }

        // 2. Header kontrolü
        if (!context.Request.Headers.TryGetValue(IdempotencyHeader, out var key) || string.IsNullOrWhiteSpace(key))
        {
            await next(context);
            return;
        }

        // 🛡️ USER ISOLATION: Anahtarı kullanıcıya özel kıl (Cross-user replay saldırılarını engeller)
        var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
        var cacheKey = $"idempotency:{userId}:{key}";

        // 3. Cache Kontrolü
        var cachedResponse = await cache.GetStringAsync(cacheKey);
        if (cachedResponse != null)
        {
            if (cachedResponse == "Processing")
            {
                context.Response.StatusCode = StatusCodes.Status409Conflict;
                await context.Response.WriteAsync("İşlem şu an zaten yürütülüyor. Lütfen bekleyin.");
                return;
            }

            // Eski sonucu (Replay) dön
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = StatusCodes.Status200OK;
            await context.Response.WriteAsync(cachedResponse);
            return;
        }

        // 4. İşlemi "Yürütülüyor" olarak işaretle (Kısa süreli kilit - örn: 10 dk)
        await cache.SetStringAsync(cacheKey, "Processing", new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
        });

        // 5. Response Akışını Yakala
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await next(context);

            // 6. Başarılı sonuçları cache'le
            if (context.Response.StatusCode is StatusCodes.Status200OK or StatusCodes.Status201Created)
            {
                responseBody.Seek(0, SeekOrigin.Begin);
                var responseContent = await new StreamReader(responseBody).ReadToEndAsync();
                responseBody.Seek(0, SeekOrigin.Begin);

                await cache.SetStringAsync(cacheKey, responseContent, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(attribute.ExpiryHours)
                });
            }
            else
            {
                // Hata durumunda kilidi kaldır ki kullanıcı tekrar deneyebilsin (Opsiyonel strateji)
                await cache.RemoveAsync(cacheKey);
            }

            await responseBody.CopyToAsync(originalBodyStream);
        }
        catch
        {
            await cache.RemoveAsync(cacheKey);
            throw;
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }
}
