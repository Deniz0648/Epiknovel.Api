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
        if (Context.User?.Identity?.IsAuthenticated == true)
        {
            var userId = Context.UserIdentifier;
            
            if (Context.User.IsInRole("Admin") || Context.User.IsInRole("SuperAdmin"))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
                Console.WriteLine($"[HUB_GROUP] User {userId} added to Admins group.");
            }
            
            if (Context.User.IsInRole("Mod"))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Moderators");
                Console.WriteLine($"[HUB_GROUP] User {userId} added to Moderators group.");
            }
        }

        await base.OnConnectedAsync();
    }
}
