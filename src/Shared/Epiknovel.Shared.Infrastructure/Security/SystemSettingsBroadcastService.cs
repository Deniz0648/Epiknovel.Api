using Epiknovel.Shared.Core.Interfaces.SignalR;
using Epiknovel.Shared.Infrastructure.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace Epiknovel.Shared.Infrastructure.Security;

public sealed class SystemSettingsBroadcastService(IHubContext<SystemSettingsHub> hubContext) : ISystemSettingsBroadcastService
{
    public async Task BroadcastSettingUpdatedAsync(string key, string value, CancellationToken ct = default)
    {
        // "SettingUpdated" mesajını tüm bağlı istemcilere (misafirler dahil) gönderir.
        await hubContext.Clients.All.SendAsync("SettingUpdated", key, value, ct);
    }
}
