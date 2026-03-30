using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace Epiknovel.Shared.Infrastructure.Hubs;

[Authorize]
public class GlobalNotificationHub : Hub
{
    // Bağlantı kurulduğunda kullanıcıyı kendi ID'siyle eşleşen bir gruba alabiliriz 
    // ama SignalR .User(userId) metodu zaten bunu Claims üzerinden yönetiyor.
    
    public override async Task OnConnectedAsync()
    {
        // İsteğe bağlı: Logger.LogInformation($"User {Context.UserIdentifier} connected.");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
