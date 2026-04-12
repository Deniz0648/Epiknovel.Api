using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Endpoints.Support.CreateTicket;

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/management/support/tickets");
        Policies("BOLA");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var ticket = new SupportTicket
        {
            UserId = req.UserId,
            Title = req.Title,
            Description = req.Description,
            Category = req.Category,
            Status = TicketStatus.Open,
            CreatedAt = DateTime.UtcNow
        };

        // Add the first message as part of the ticket creation if needed, 
        // or just keep description in ticket itself. 
        // Based on the domain model, SupportTicket has Description.
        
        dbContext.SupportTickets.Add(ticket);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Id = ticket.Id, 
            Message = "Destek talebiniz başarıyla oluşturuldu." 
        }), 201, ct);
    }
}
