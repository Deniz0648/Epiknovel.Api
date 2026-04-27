using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Modules.Compliance.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Epiknovel.Modules.Compliance.Endpoints.Admin.Legal;

public record UpsertLegalDocumentRequest
{
    public Guid? Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string VersionNumber { get; init; } = "1.0";
    public string ChangeNote { get; init; } = string.Empty;
    public bool PublishImmediately { get; init; }
}

public class UpsertLegalDocumentEndpoint(ComplianceDbContext dbContext) : Endpoint<UpsertLegalDocumentRequest, Result<Guid>>
{
    public override void Configure()
    {
        Post("/management/compliance/legal");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(UpsertLegalDocumentRequest req, CancellationToken ct)
    {
        LegalDocument? doc;
        
        if (req.Id.HasValue)
        {
            doc = await dbContext.LegalDocuments
                .Include(d => d.Versions)
                .FirstOrDefaultAsync(d => d.Id == req.Id.Value, ct);
            
            if (doc == null)
            {
                await Send.ResponseAsync(Result<Guid>.Failure("Belge bulunamadı."), 404, ct);
                return;
            }

            doc.Title = req.Title;
            doc.Slug = req.Slug;
        }
        else
        {
            doc = new LegalDocument
            {
                Title = req.Title,
                Slug = req.Slug
            };
            dbContext.LegalDocuments.Add(doc);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        
        var version = new LegalDocumentVersion
        {
            Document = doc,
            Content = req.Content,
            VersionNumber = req.VersionNumber,
            ChangeNote = req.ChangeNote,
            IsPublished = req.PublishImmediately,
            PublishedAt = req.PublishImmediately ? DateTime.UtcNow : null,
            PublishedByUserId = req.PublishImmediately && userId != null ? Guid.Parse(userId) : null
        };

        dbContext.LegalDocumentVersions.Add(version);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(doc.Id, "Belge ve versiyon kaydedildi."), 200, ct);
    }
}
