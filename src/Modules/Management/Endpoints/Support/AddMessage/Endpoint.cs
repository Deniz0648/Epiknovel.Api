using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;

using Microsoft.AspNetCore.SignalR;
using Epiknovel.Modules.Management.Hubs;

namespace Epiknovel.Modules.Management.Endpoints.Support.AddMessage;

public class Endpoint(ManagementDbContext dbContext, IHubContext<SupportTicketHub> hubContext, MediatR.IMediator mediator) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/management/support/tickets/{TicketId}/messages");
        Policies("BOLA");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var ticket = await dbContext.SupportTickets.FirstOrDefaultAsync(x => x.Id == req.TicketId, ct);
        if (ticket == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        if (ticket.Status == TicketStatus.Closed)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kapatılmış bir talebe mesaj gönderemezsiniz."), 400, ct);
            return;
        }

        bool isAdmin = User.HasClaim(c => c.Type == global::System.Security.Claims.ClaimTypes.Role && (c.Value == "Admin" || c.Value == "SuperAdmin"));
        if (ticket.UserId != req.UserId && !isAdmin)
        {
            await Send.ForbiddenAsync(ct);
            return;
        }

        var message = new SupportTicketMessage
        {
            TicketId = req.TicketId,
            UserId = req.UserId,
            Content = req.Content,
            IsAdminResponse = isAdmin,
            CreatedAt = DateTime.UtcNow
        };

        ticket.LastRespondedAt = DateTime.UtcNow;
        if (isAdmin && ticket.Status == TicketStatus.Open)
        {
            ticket.Status = TicketStatus.InReview;
        }

        dbContext.SupportTicketMessages.Add(message);
        await dbContext.SaveChangesAsync(ct);

        // Canlı bildirim gönder
        await hubContext.Clients.Group($"SupportTicket_{req.TicketId}")
            .SendAsync("ReceiveMessage", new 
            {
                Id = message.Id,
                TicketId = message.TicketId,
                UserId = message.UserId,
                Content = message.Content,
                IsAdminResponse = message.IsAdminResponse,
                CreatedAt = message.CreatedAt
            }, ct);
        
        if (isAdmin && ticket.UserId != req.UserId)
        {
            await mediator.Publish(new Epiknovel.Shared.Core.Events.SupportResponseReceivedEvent(
                ticket.UserId,
                ticket.Id,
                ticket.Title,
                req.Content,
                $"/support/tickets/{ticket.Id}"
            ), ct);
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Id = message.Id, 
            Message = "Mesajınız başarıyla iletildi." 
        }), 201, ct);
    }
}
