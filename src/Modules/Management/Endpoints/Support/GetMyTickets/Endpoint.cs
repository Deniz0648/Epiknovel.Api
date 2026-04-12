using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Endpoints.Support.GetMyTickets;

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/management/support/tickets/mine");
        Policies("BOLA");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var tickets = await dbContext.SupportTickets
            .AsNoTracking()
            .Where(x => x.UserId == req.UserId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new TicketItem
            {
                Id = x.Id,
                Title = x.Title,
                Status = x.Status,
                CreatedAt = x.CreatedAt,
                LastRespondedAt = x.LastRespondedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Tickets = tickets 
        }), 200, ct);
    }
}
