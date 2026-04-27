using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.PaidAuthor.GetDocument;

public record Request
{
    public Guid ApplicationId { get; init; }
    public string DocumentType { get; init; } = string.Empty; // "Exemption" veya "Bank"
}

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request>
{
    public override void Configure()
    {
        Get("/management/paid-author/documents/{ApplicationId}/{DocumentType}");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvuru belgesini getir.";
            s.Description = "Adminlerin, yapılan ücretli yazarlık başvurularına ait 'Exemption' veya 'Bank' belgelerini görüntülemasını veya indirmesini sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var application = await dbContext.PaidAuthorApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == req.ApplicationId, ct);

        if (application == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Başvuru bulunamadı."), 404, ct);
            return;
        }

        Guid documentId = req.DocumentType.Equals("Exemption", StringComparison.OrdinalIgnoreCase)
            ? application.GvkExemptionCertificateId
            : application.BankAccountDocumentId;

        if (documentId == Guid.Empty)
        {
            await Send.ResponseAsync(Result<string>.Failure("Belge bulunamadı."), 404, ct);
            return;
        }

        // Merkezi doküman indirme endpoint'ine yönlendir
        // Bu endpoint BOLA ve Admin kontrollerini otomatik yapar.
        await Send.RedirectAsync($"/compliance/documents/{documentId}/download", false, false);
    }
}
