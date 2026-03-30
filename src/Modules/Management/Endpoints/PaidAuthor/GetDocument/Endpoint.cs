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

public class Endpoint(ManagementDbContext dbContext, IFileService fileService) : Endpoint<Request>
{
    public override void Configure()
    {
        Get("/management/paid-author/documents/{ApplicationId}/{DocumentType}");
        Policies(PolicyNames.AdminAccess);
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

        string fileName = req.DocumentType.Equals("Exemption", StringComparison.OrdinalIgnoreCase)
            ? application.GvkExemptionCertificateUrl
            : application.BankAccountDocumentUrl;

        if (string.IsNullOrEmpty(fileName))
        {
            await Send.ResponseAsync(Result<string>.Failure("Belge bulunamadı."), 404, ct);
            return;
        }

        try
        {
            var stream = await fileService.GetSecureFileStreamAsync(fileName, "author_documents");
            
            // PDF varsayılan
            var contentType = "application/pdf";
            if (fileName.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase)) contentType = "image/jpeg";
            if (fileName.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) contentType = "image/png";

            await Send.StreamAsync(stream, fileName, stream.Length, contentType, cancellation: ct);
        }
        catch (FileNotFoundException)
        {
            await Send.ResponseAsync(Result<string>.Failure("Dosya sunucuda bulunamadı."), 404, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Hata: {ex.Message}"), 500, ct);
        }
    }
}
