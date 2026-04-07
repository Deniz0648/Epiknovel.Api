using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Quotes;

public class CreateQuoteRequest
{
    public string Content { get; set; } = string.Empty;
    public string AuthorName { get; set; } = "Anonim";
}

[AuditLog("Create Management Quote")]
public class CreateQuoteEndpoint(ManagementDbContext dbContext) : Endpoint<CreateQuoteRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/compliance/quotes");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CreateQuoteRequest req, CancellationToken ct)
    {
        var quote = new DailyQuote
        {
            Content = req.Content,
            AuthorName = req.AuthorName,
            IsActive = true
        };

        dbContext.DailyQuotes.Add(quote);
        await dbContext.SaveChangesAsync(ct);
        
        await Send.ResponseAsync(Result<string>.Success("Ozlu soz basariyla eklendi."), 201, ct);
    }
}
