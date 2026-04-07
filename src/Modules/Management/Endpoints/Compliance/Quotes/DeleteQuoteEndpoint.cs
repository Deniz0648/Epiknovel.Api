using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Quotes;

[AuditLog("Delete Management Quote")]
public class DeleteQuoteEndpoint(ManagementDbContext dbContext) : EndpointWithoutRequest<Result<string>>
{
    public override void Configure()
    {
        Delete("/management/compliance/quotes/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<Guid>("Id");
        var quote = await dbContext.DailyQuotes.FindAsync([id], ct);
        
        if (quote == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Ozlu soz bulunamadi."), 404, ct);
            return;
        }

        dbContext.DailyQuotes.Remove(quote);
        await dbContext.SaveChangesAsync(ct);
        
        await Send.ResponseAsync(Result<string>.Success("Ozlu soz basariyla silindi."), 200, ct);
    }
}
