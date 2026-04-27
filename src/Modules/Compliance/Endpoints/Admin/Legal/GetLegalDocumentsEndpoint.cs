using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Compliance.Endpoints.Admin.Legal;

public record LegalDocumentSummary
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string LatestVersion { get; init; } = string.Empty;
    public DateTime? LastPublishedAt { get; init; }
    public bool HasDraft { get; init; }
}

public class GetLegalDocumentsEndpoint(ComplianceDbContext dbContext) : EndpointWithoutRequest<Result<List<LegalDocumentSummary>>>
{
    public override void Configure()
    {
        Get("/management/compliance/legal");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var documents = await dbContext.LegalDocuments
            .AsNoTracking()
            .Select(d => new LegalDocumentSummary
            {
                Id = d.Id,
                Title = d.Title,
                Slug = d.Slug,
                LatestVersion = d.Versions.Where(v => v.IsPublished).OrderByDescending(v => v.PublishedAt).Select(v => v.VersionNumber).FirstOrDefault() ?? "Yok",
                LastPublishedAt = d.Versions.Where(v => v.IsPublished).Max(v => v.PublishedAt),
                HasDraft = d.Versions.Any(v => !v.IsPublished)
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<LegalDocumentSummary>>.Success(documents), 200, ct);
    }
}
