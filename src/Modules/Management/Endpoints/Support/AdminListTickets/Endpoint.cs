using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Support.AdminListTickets;

public class Endpoint(ManagementDbContext dbContext, IUserAccountProvider userAccountProvider) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/management/support/tickets");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var query = dbContext.SupportTickets.AsNoTracking();

        if (req.Status.HasValue)
        {
            query = query.Where(x => x.Status == req.Status.Value);
        }

        var totalCount = await query.CountAsync(ct);
        var tickets = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((req.Page - 1) * req.Take)
            .Take(req.Take)
            .ToListAsync(ct);

        var userIds = tickets.Select(x => x.UserId).Distinct().ToArray();
        var displayNames = await userAccountProvider.GetDisplayNamesAsync(userIds, ct);

        var response = new Response
        {
            TotalCount = totalCount,
            Tickets = tickets.Select(x => new TicketAdminItem
            {
                Id = x.Id,
                UserId = x.UserId,
                UserDisplayName = displayNames.GetValueOrDefault(x.UserId, "Kullanıcı"),
                Title = x.Title,
                Category = x.Category,
                Status = x.Status,
                CreatedAt = x.CreatedAt,
                LastRespondedAt = x.LastRespondedAt
            }).ToList()
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}
