using Microsoft.AspNetCore.SignalR;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;
using Microsoft.AspNetCore.Authorization;

namespace Epiknovel.Modules.Management.Hubs;

[Authorize]
public class SupportTicketHub(ManagementDbContext dbContext) : Hub
{
    public async Task JoinTicketGroup(Guid ticketId)
    {
        var userIdStr = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return;

        // Check ownership or admin status
        var ticket = await dbContext.SupportTickets
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null) return;

        var isAdmin = Context.User?.IsInRole(RoleNames.Admin) == true || Context.User?.IsInRole(RoleNames.SuperAdmin) == true;
        
        if (ticket.UserId != userId && !isAdmin)
        {
            // Unauthorized access to this ticket
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, ticketId.ToString());
    }

    public async Task SendMessage(Guid ticketId, string content)
    {
        var userIdStr = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return;

        var ticket = await dbContext.SupportTickets
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null || ticket.Status == TicketStatus.Closed) return;

        var isAdmin = Context.User?.IsInRole(RoleNames.Admin) == true || Context.User?.IsInRole(RoleNames.SuperAdmin) == true;

        if (ticket.UserId != userId && !isAdmin) return;

        // Persist to Database
        var message = new SupportTicketMessage
        {
            TicketId = ticketId,
            UserId = userId,
            Content = content,
            IsAdminResponse = isAdmin,
            CreatedAt = DateTime.UtcNow
        };

        ticket.LastRespondedAt = DateTime.UtcNow;
        if (isAdmin && ticket.Status == TicketStatus.Open)
        {
            ticket.Status = TicketStatus.InReview;
        }

        dbContext.SupportTicketMessages.Add(message);
        await dbContext.SaveChangesAsync();

        // Broadcast to Group (Group Name is TicketId)
        await Clients.Group(ticketId.ToString()).SendAsync("ReceiveMessage", new 
        {
            message.Id,
            message.UserId,
            message.Content,
            message.IsAdminResponse,
            message.CreatedAt
        });
    }
}
