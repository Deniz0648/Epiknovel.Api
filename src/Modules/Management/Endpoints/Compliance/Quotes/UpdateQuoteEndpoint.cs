using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Quotes;

public class UpdateQuoteRequest
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? AuthorName { get; set; }
}

[AuditLog("Update Quote")]
public class UpdateQuoteEndpoint(ManagementDbContext dbContext) : Endpoint<UpdateQuoteRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/compliance/quotes/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateQuoteRequest req, CancellationToken ct)
    {
        var quote = await dbContext.DailyQuotes.FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (quote == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Soz bulunamadi."), 404, ct);
            return;
        }

        quote.Content = req.Content;
        quote.AuthorName = req.AuthorName;

        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<string>.Success("Soz guncellendi."), 200, ct);
    }
}
