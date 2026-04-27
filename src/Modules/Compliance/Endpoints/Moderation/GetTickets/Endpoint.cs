using FastEndpoints;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Epiknovel.Modules.Compliance.Endpoints.Moderation.GetTickets;

public class Endpoint(ComplianceDbContext dbContext) : EndpointWithoutRequest<Result<object>>
{
    public override void Configure()
    {
        Get("/compliance/moderation/tickets");
        Policies(Epiknovel.Shared.Core.Constants.PolicyNames.ModAccess);
        Summary(s => {
            s.Summary = "Bekleyen Moderasyon Biletlerini getir.";
            s.Description = "Sadece adminlerin görebileceği şikayetler listesi.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var tickets = await dbContext.ModerationTickets
            .Where(t => t.Status == Domain.TicketStatus.Pending)
            .OrderByDescending(t => t.ReportCount)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => new { 
                t.Id, 
                t.ContentId, 
                ContentType = t.ContentType.ToString(), 
                TopReason = t.TopReason.ToString(), 
                t.InitialDescription, 
                t.ReportCount, 
                t.CreatedAt 
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<object>.Success(tickets), 200, ct);
    }
}
