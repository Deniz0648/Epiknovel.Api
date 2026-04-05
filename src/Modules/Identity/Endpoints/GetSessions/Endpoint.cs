using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Identity.Endpoints.GetSessions;

public class Endpoint(IdentityDbContext dbContext) : EndpointWithoutRequest<Result<List<Response>>>
{
    public override void Configure()
    {
        Get("/auth/sessions");
        Summary(s => {
            s.Summary = "Aktif oturumları listeler.";
            s.Description = "Kullanıcının tüm cihazlardaki aktif oturum bilgilerini döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        // FastEndpoints veya ASP.NET Core JTI claim'ini farklı isimlerle (jti, jwtid vs.) saklayabilir. 
        // En yaygın olanları deniyoruz.
        var currentJti = User.FindFirstValue("jti") ?? User.FindFirstValue("jwtid");

        if (userId == null)
        {
            await Send.ResponseAsync(Result<List<Response>>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var sessions = await dbContext.UserSessions
            .AsNoTracking()
            .Where(x => x.UserId == Guid.Parse(userId) && x.ExpiryDate > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        var responseData = sessions.Select(x => new Response
        {
            SessionId = x.Id,
            Device = ParseUserAgent(x.UserAgent),
            IpAddress = x.IpAddress,
            CreatedAt = x.CreatedAt,
            IsCurrent = x.AccessTokenJti == currentJti 
        }).ToList();

        await Send.ResponseAsync(Result<List<Response>>.Success(responseData), 200, ct);
    }

    private static string ParseUserAgent(string userAgent)
    {
        if (string.IsNullOrEmpty(userAgent)) return "Bilinmeyen Cihaz";

        var isMobile = userAgent.Contains("Mobile", StringComparison.OrdinalIgnoreCase) || 
                       userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) || 
                       userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase) ||
                       userAgent.Contains("iPad", StringComparison.OrdinalIgnoreCase);

        var browser = "Bilinmeyen Tarayıcı";
        if (userAgent.Contains("Edg/", StringComparison.OrdinalIgnoreCase)) browser = "Edge";
        else if (userAgent.Contains("Chrome/", StringComparison.OrdinalIgnoreCase)) browser = "Chrome";
        else if (userAgent.Contains("Firefox/", StringComparison.OrdinalIgnoreCase)) browser = "Firefox";
        else if (userAgent.Contains("Safari/", StringComparison.OrdinalIgnoreCase) && !userAgent.Contains("Chrome", StringComparison.OrdinalIgnoreCase)) browser = "Safari";
        else if (userAgent.Contains("Opera/", StringComparison.OrdinalIgnoreCase) || userAgent.Contains("OPR/", StringComparison.OrdinalIgnoreCase)) browser = "Opera";

        var osInfo = "Bilinmeyen OS";
        if (userAgent.Contains("Windows NT 10.0", StringComparison.OrdinalIgnoreCase)) osInfo = "Windows 10/11";
        else if (userAgent.Contains("Windows NT 6.1", StringComparison.OrdinalIgnoreCase)) osInfo = "Windows 7";
        else if (userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase)) osInfo = "Android";
        else if (userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase)) osInfo = "iOS (iPhone)";
        else if (userAgent.Contains("iPad", StringComparison.OrdinalIgnoreCase)) osInfo = "iOS (iPad)";
        else if (userAgent.Contains("Macintosh", StringComparison.OrdinalIgnoreCase)) osInfo = "macOS";
        else if (userAgent.Contains("Linux", StringComparison.OrdinalIgnoreCase)) osInfo = "Linux";

        // NOT: Tarayıcılar güvenlik nedeniyle "Bilgisayar Adı" veya "Telefon Adı" (kişisel isim) bilgisini göndermezler.
        // Sadece model ve OS bilgisi alınabilir.
        if (isMobile)
        {
            return $"Mobil / {osInfo} ({browser})";
        }

        return $"Web / {osInfo} ({browser})";
    }
}

