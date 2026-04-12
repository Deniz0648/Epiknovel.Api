using Microsoft.AspNetCore.SignalR;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;
using Microsoft.AspNetCore.Authorization;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Hubs;

[Authorize]
public class SupportTicketHub(
    ManagementDbContext dbContext,
    IPermissionService permissionService) : Hub
{
    public async Task JoinTicket(Guid ticketId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"SupportTicket_{ticketId}");
    }

    public async Task LeaveTicket(Guid ticketId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"SupportTicket_{ticketId}");
    }

    public async Task SendMessage(Guid ticketId, string content)
    {
        var userIdStr = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId)) return;

        var ticket = await dbContext.SupportTickets
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null || ticket.Status == TicketStatus.Closed) return;

        var isAdmin = Context.User != null &&
            await permissionService.HasPermissionAsync(Context.User, PermissionNames.AdminAccess);

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
