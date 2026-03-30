using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Admin.DailyQuotes.Add;

public record Request
{
    public string Content { get; init; } = string.Empty;
    public string AuthorName { get; init; } = "Anonim";
    public DateTime? PublishDate { get; init; }
}

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/management/admin/daily-quotes");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var quote = new DailyQuote
        {
            Content = req.Content,
            AuthorName = req.AuthorName,
            PublishDate = req.PublishDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.DailyQuotes.Add(quote);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(quote.Id), 200, ct);
    }
}
