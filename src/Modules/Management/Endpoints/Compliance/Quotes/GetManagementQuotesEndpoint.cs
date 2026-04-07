using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Quotes;

[AuditLog("View Management Quotes")]
public class GetManagementQuotesEndpoint(ManagementDbContext dbContext) : EndpointWithoutRequest<Result<List<DailyQuote>>>
{
    public override void Configure()
    {
        Get("/management/compliance/quotes");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var quotes = await dbContext.DailyQuotes.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        await Send.ResponseAsync(Result<List<DailyQuote>>.Success(quotes), 200, ct);
    }
}
