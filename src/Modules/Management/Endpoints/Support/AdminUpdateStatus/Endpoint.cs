using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Support.AdminUpdateStatus;

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Patch("/management/support/tickets/{Id}/status");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var ticket = await dbContext.SupportTickets.FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (ticket == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        ticket.Status = req.Status;
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Message = $"Ticket durumu {req.Status} olarak güncellendi." 
        }), 200, ct);
    }
}
