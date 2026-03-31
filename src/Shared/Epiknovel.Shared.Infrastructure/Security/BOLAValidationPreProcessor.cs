using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Epiknovel.Shared.Core.Interfaces;
using System.Security.Claims;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Shared.Infrastructure.Security;

/// <summary>
/// Global BOLA (Broken Object Level Authorization) Pre-Processor.
/// Herhangi bir Request 'IOwnable' arayüzünü uyguluyorsa, 
/// istekteki UserId ile token'daki UserId uyuşmazlığını kontrol eder (Fast-Fail).
/// </summary>
public class BOLAValidationPreProcessor : IGlobalPreProcessor
{
    public async Task PreProcessAsync(IPreProcessorContext context, CancellationToken ct)
    {
        // 1. Request IOwnable tipinde mi?
        if (context.Request is IOwnable ownable)
        {
            // 2. Token'dan UserId'yi al
            var claim = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out var currentUserId))
            {
                // Giriş yapılmamış ama IOwnable bir işlem yapılmaya çalışılıyor
                await context.HttpContext.Response.SendAsync(Result<object>.Failure("Yetkisiz erişim."), 401, cancellation: ct);
                return;
            }

            // 3. Eğer Request içindeki UserId, Token'dakinden farklıysa (ZARARLI İŞLEM TESPİTİ)
            // Not: Endpoint'ler bu UserId'yi FromClaim ile de doldurabilirler ancak 
            // manuel gönderilen farklı bir ID'yi burada yakalıyoruz.
            if (ownable.UserId != Guid.Empty && ownable.UserId != currentUserId)
            {
                // Güvenlik: 403 yerine 404 dönerek kaynağın varlığını bile gizliyoruz (Stealth Defense)
                await context.HttpContext.Response.SendAsync(Result<object>.Failure("Kaynak bulunamadı."), 404, cancellation: ct);
                return;
            }

            // 4. Otomatik Tamamlama: Eğer Request içindeki UserId boşsa (Guid.Empty), 
            // altyapı olarak biz dolduruyoruz (Secure-by-Default).
            if (ownable.UserId == Guid.Empty)
            {
                ownable.UserId = currentUserId;
            }
        }

        // --- IMPERSONATION SECURITY CHECK ---
        var isImpersonated = context.HttpContext.User.HasClaim(c => c.Type == "IsImpersonated" && c.Value == "true");
        if (isImpersonated)
        {
            var path = context.HttpContext.Request.Path.Value?.ToLowerInvariant() ?? "";
            
            // Financial or Security related endpoints
            var isSensitive = path.Contains("/wallet") || 
                              path.Contains("/payout") || 
                              path.Contains("/purchase") || 
                              path.Contains("/password") || 
                              path.Contains("/security") ||
                              path.Contains("/withdraw");

            if (isSensitive)
            {
                await context.HttpContext.Response.SendAsync(Result<object>.Failure("Görüntüleme modunda finansal veya güvenlik işlemleri yapılamaz."), 403, cancellation: ct);
                return;
            }
        }
    }
}
