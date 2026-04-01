using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Constants;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Epiknovel.Modules.Management.Endpoints.System.Settings;

public class UpdateRequest
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class Update : Endpoint<UpdateRequest>
{
    private readonly ManagementDbContext dbContext;
    public Update(ManagementDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public override void Configure()
    {
        Put("/management/system/settings");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Update a system setting";
            s.Description = "Update or create a system setting by its key (e.g., SMTP_Host).";
        });
    }

    public override async Task HandleAsync(UpdateRequest req, CancellationToken ct)
    {
        var actorIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(actorIdRaw, out var actorId))
        {
            await Send.UnauthorizedAsync(ct);
            return;
        }

        var setting = await dbContext.SystemSettings.FirstOrDefaultAsync(x => x.Key == req.Key, ct);
        
        if (setting == null)
        {
            setting = new Domain.SystemSetting { Key = req.Key };
            dbContext.SystemSettings.Add(setting);
        }

        setting.Value = req.Value;
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedByUserId = actorId;

        await dbContext.SaveChangesAsync(ct);
        await Send.NoContentAsync(ct);
    }
}
