using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace Epiknovel.Shared.Infrastructure.Hubs;

/// <summary>
/// Tüm kullanıcılara (misafirler dahil) açık olan sistem-seviyesi HUB.
/// Site ayarları, global duyurular vb. için kullanılır.
/// </summary>
[AllowAnonymous]
public class SystemSettingsHub : Hub
{
    // Clients.All.SendAsync("SettingUpdated", key, value) şeklinde kullanılır.
}
