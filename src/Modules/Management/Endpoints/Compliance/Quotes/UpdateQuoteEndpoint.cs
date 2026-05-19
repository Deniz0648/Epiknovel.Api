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
    private const int MaxQuoteContentLength = 2000;
    private const int MaxAuthorNameLength = 120;

    public override void Configure()
    {
        Put("/management/compliance/quotes/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateQuoteRequest req, CancellationToken ct)
    {
        var routeId = Route<Guid>("Id");
        if (routeId == Guid.Empty || req.Id == Guid.Empty || routeId != req.Id)
        {
            await Send.ResponseAsync(Result<string>.Failure("Route Id ve payload Id eslesmiyor."), 400, ct);
            return;
        }

        var content = (req.Content ?? string.Empty).Trim();
        var authorName = string.IsNullOrWhiteSpace(req.AuthorName) ? "Anonim" : req.AuthorName.Trim();

        if (string.IsNullOrWhiteSpace(content))
        {
            await Send.ResponseAsync(Result<string>.Failure("Soz icerigi bos olamaz."), 400, ct);
            return;
        }
        if (content.Length > MaxQuoteContentLength)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Soz en fazla {MaxQuoteContentLength} karakter olabilir."), 400, ct);
            return;
        }
        if (authorName.Length > MaxAuthorNameLength)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Yazar adi en fazla {MaxAuthorNameLength} karakter olabilir."), 400, ct);
            return;
        }

        var quote = await dbContext.DailyQuotes.FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (quote == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Soz bulunamadi."), 404, ct);
            return;
        }

        quote.Content = content;
        quote.AuthorName = authorName;

        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<string>.Success("Soz guncellendi."), 200, ct);
    }
}
