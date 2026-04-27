using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Compliance.Endpoints.Legal;

public record DocumentResponse
{
    public string Title { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public DateTime? PublishedAt { get; init; }
}

public class GetLatestDocumentEndpoint(ComplianceDbContext dbContext) : EndpointWithoutRequest<Result<DocumentResponse>>
{
    public override void Configure()
    {
        Get("/compliance/legal/{slug}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var slug = Route<string>("slug");

        var doc = await dbContext.LegalDocuments
            .AsNoTracking()
            .Where(d => d.Slug == slug)
            .Select(d => new
            {
                d.Title,
                Latest = d.Versions
                    .Where(v => v.IsPublished)
                    .OrderByDescending(v => v.PublishedAt)
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(ct);

        if (doc == null || doc.Latest == null)
        {
            await Send.ResponseAsync(Result<DocumentResponse>.Failure("Belge bulunamadı."), 404, ct);
            return;
        }

        await Send.ResponseAsync(Result<DocumentResponse>.Success(new DocumentResponse
        {
            Title = doc.Title,
            Content = doc.Latest.Content,
            Version = doc.Latest.VersionNumber,
            PublishedAt = doc.Latest.PublishedAt
        }), 200, ct);
    }
}
