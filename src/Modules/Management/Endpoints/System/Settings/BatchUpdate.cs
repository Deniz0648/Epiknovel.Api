using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Management.Endpoints.System.Settings;

public class BatchUpdate(ManagementDbContext dbContext, ISystemSettingsBroadcastService broadcastService) : Endpoint<List<UpdateRequest>, Result<bool>>
{
    public override void Configure()
    {
        Put("/management/settings/batch");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Toplu ayar güncellemesi (Admin).";
            s.Description = "Birden fazla konfigürasyonu aynı anda günceller.";
        });
    }

    public override async Task HandleAsync(List<UpdateRequest> req, CancellationToken ct)
    {
        var actorIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        Guid.TryParse(actorIdRaw, out var actorId);

        if (req == null || req.Count == 0)
        {
            await Send.ResponseAsync(Result<bool>.Success(true), 200, ct);
            return;
        }

        foreach (var item in req)
        {
            var setting = await dbContext.SystemSettings.FirstOrDefaultAsync(x => x.Key == item.Key, ct);
            
            if (setting == null)
            {
                setting = new Domain.SystemSetting 
                { 
                    Key = item.Key,
                    Description = "System generated template or setting"
                };
                dbContext.SystemSettings.Add(setting);
            }

            setting.Value = item.Value ?? string.Empty;
            setting.UpdatedAt = DateTime.UtcNow;
            setting.UpdatedByUserId = actorId;

            // Broadcast real-time change
            await broadcastService.BroadcastSettingUpdatedAsync(item.Key, setting.Value, ct);
        }

        await dbContext.SaveChangesAsync(ct);
        
        // Standart Result wrapper'ı açıkça dönüyoruz (isSuccess, message, data içeren obje)
        var response = new Result<bool>
        {
            IsSuccess = true,
            Data = true,
            Message = "Ayarlar başarıyla güncellendi."
        };

        await Send.ResponseAsync(response, 200, ct);
    }
}
