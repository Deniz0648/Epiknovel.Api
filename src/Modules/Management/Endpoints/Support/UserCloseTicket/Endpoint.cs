using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Management.Endpoints.Support.UserCloseTicket;

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/management/support/tickets/{Id}/close");
        Policies("BOLA");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var ticket = await dbContext.SupportTickets.FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (ticket == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        if (ticket.UserId != req.UserId)
        {
            await Send.ForbiddenAsync(ct);
            return;
        }

        ticket.Status = TicketStatus.Closed;
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Message = "Destek talebi başarıyla kapatıldı." 
        }), 200, ct);
    }
}
