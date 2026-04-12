using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Management.Endpoints.System.Settings;

public class GetAll(ManagementDbContext dbContext) : EndpointWithoutRequest<Result<List<SystemSetting>>>
{
    public override void Configure()
    {
        Get("/management/settings");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Tüm sistem ayarlarını getir (Admin).";
            s.Description = "Sistemdeki tüm konfigürasyon anahtarlarını ve değerlerini döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var settings = await dbContext.SystemSettings
            .OrderBy(x => x.Key)
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<SystemSetting>>.Success(settings), 200, ct);
    }
}
