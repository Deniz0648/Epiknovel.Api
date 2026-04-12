using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Models;
using System.Collections.Generic;
using System.Linq;

namespace Epiknovel.Modules.Management.Endpoints.System.Settings;

public class GetPublicSettings : EndpointWithoutRequest<Result<Dictionary<string, string>>>
{
    private readonly ManagementDbContext _context;

    public GetPublicSettings(ManagementDbContext context)
    {
        _context = context;
    }

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
        var allowedKeys = new List<string> { 
            "Economy_EnableWalletSystem", 
            "Economy_EnablePurchasing",
            Epiknovel.Shared.Core.Constants.SettingKeys.Site.Name,
            Epiknovel.Shared.Core.Constants.SettingKeys.Site.Slogan,
            Epiknovel.Shared.Core.Constants.SettingKeys.Site.LogoUrl,
            Epiknovel.Shared.Core.Constants.SettingKeys.Site.FaviconUrl,
            Epiknovel.Shared.Core.Constants.SettingKeys.Site.MaintenanceMode,
            Epiknovel.Shared.Core.Constants.SettingKeys.Rewards.EnableRewards,
            "CONTENT_AllowNewBooks",
            "CONTENT_AllowPaidChapters",
            "CONTENT_EnableWallet",
            "CONTENT_AllowAuthorApplications"
        };

        var settingsList = await _context.SystemSettings
            .Where(x => allowedKeys.Contains(x.Key))
            .ToListAsync(ct);

        var settingsDict = settingsList.ToDictionary(x => x.Key, x => x.Value);
        
        // 🚀 Frontend'in beklediği standart Result formatina sariyoruz.
        var response = Result<Dictionary<string, string>>.Success(settingsDict);

        await Send.ResponseAsync(response, 200, ct);
    }
}
