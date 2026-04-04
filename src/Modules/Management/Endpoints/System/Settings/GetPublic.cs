using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.Extensions.DependencyInjection;

namespace Epiknovel.Modules.Management.Endpoints.System.Settings;

public class GetPublicSettings : EndpointWithoutRequest<Dictionary<string, string>>
{
    public override void Configure()
    {
        Get("/Settings/public");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Tüm genel sistem ayarlarını getirir.";
            s.Description = "Giriş gerektirmez. Web arayüzü konfigürasyonu için kullanılır.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        // 🚀 Security: Whitelist yaklaşımı ile sadece "zararsız" anahtarları herkese açıyoruz.
        // Hassas verilerin (Secret, Password vb.) sızmasını engeller.
        var allowedKeys = new[] { 
            "Economy_EnableWalletSystem", 
            "Economy_EnablePurchasing"
        };

        var settings = await (HttpContext.RequestServices.GetRequiredService<ManagementDbContext>())
            .SystemSettings
            .Where(x => allowedKeys.Contains(x.Key))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);

        await Send.ResponseAsync(settings, 200, ct);
    }
}
