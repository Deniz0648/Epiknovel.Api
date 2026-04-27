using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Compliance.Endpoints.Admin.Legal;

public record LegalVersionResponse
{
    public Guid Id { get; init; }
    public string VersionNumber { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string ChangeNote { get; init; } = string.Empty;
    public bool IsPublished { get; init; }
    public DateTime? PublishedAt { get; init; }
    public DateTime CreatedAt { get; init; }
}

public class GetLegalDocumentHistoryEndpoint(ComplianceDbContext dbContext) : EndpointWithoutRequest<Result<List<LegalVersionResponse>>>
{
    public override void Configure()
    {
        Get("/management/compliance/legal/{slug}/history");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var slug = Route<string>("slug");
        
        var versions = await dbContext.LegalDocumentVersions
            .AsNoTracking()
            .Where(v => v.Document.Slug == slug)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new LegalVersionResponse
            {
                Id = v.Id,
                VersionNumber = v.VersionNumber,
                Content = v.Content,
                ChangeNote = v.ChangeNote,
                IsPublished = v.IsPublished,
                PublishedAt = v.PublishedAt,
                CreatedAt = v.CreatedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<LegalVersionResponse>>.Success(versions), 200, ct);
    }
}
