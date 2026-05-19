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
    private const int MaxQuoteContentLength = 2000;
    private const int MaxAuthorNameLength = 120;

    public override void Configure()
    {
        Post("/management/compliance/quotes");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CreateQuoteRequest req, CancellationToken ct)
    {
        var content = (req.Content ?? string.Empty).Trim();
        var authorName = string.IsNullOrWhiteSpace(req.AuthorName) ? "Anonim" : req.AuthorName.Trim();

        if (string.IsNullOrWhiteSpace(content))
        {
            await Send.ResponseAsync(Result<string>.Failure("Ozlu soz icerigi bos olamaz."), 400, ct);
            return;
        }
        if (content.Length > MaxQuoteContentLength)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Ozlu soz en fazla {MaxQuoteContentLength} karakter olabilir."), 400, ct);
            return;
        }
        if (authorName.Length > MaxAuthorNameLength)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Yazar adi en fazla {MaxAuthorNameLength} karakter olabilir."), 400, ct);
            return;
        }

        var quote = new DailyQuote
        {
            Content = content,
            AuthorName = authorName,
            IsActive = true
        };

        dbContext.DailyQuotes.Add(quote);
        await dbContext.SaveChangesAsync(ct);
        
        await Send.ResponseAsync(Result<string>.Success("Ozlu soz basariyla eklendi."), 201, ct);
    }
}
