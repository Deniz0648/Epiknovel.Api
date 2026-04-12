using FastEndpoints;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.Campaigns.GetCampaigns;

public record Request
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Search { get; init; }
}

public record Response
{
    public List<SpendingCampaign> Items { get; init; } = [];
    public int TotalCount { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/wallet/admin/campaigns");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Tüm harcama kampanyalarını listeler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var query = dbContext.SpendingCampaigns
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var search = req.Search.ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(search) || x.Id.ToString().ToLower().Contains(search));
        }

        var total = await query.CountAsync(ct);

        var campaigns = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Items = campaigns,
            TotalCount = total
        }), 200, ct);
    }
}
