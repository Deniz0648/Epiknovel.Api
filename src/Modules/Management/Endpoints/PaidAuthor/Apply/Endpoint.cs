using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Management.Endpoints.PaidAuthor.Apply;

public record Request
{
    public IFormFile ExemptionCertificate { get; init; } = null!; // GVK 20/B
    public IFormFile BankDocument { get; init; } = null!; // Dekont
    public string Iban { get; init; } = string.Empty;
    public string BankName { get; init; } = string.Empty;
}

public class Endpoint(ManagementDbContext dbContext, IFileService fileService) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/management/paid-author/apply");
        AllowFileUploads();
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvurusu yap.";
            s.Description = "Kullanıcıların ücretli yazar olabilmek için gerekli belge ve IBAN bilgilerini yükleyerek başvuru yapmasını sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // 1. Zaten başvurusu var mı? (Pending olanlar)
        var existing = await dbContext.PaidAuthorApplications
            .AnyAsync(a => a.UserId == userId && a.Status == ApplicationStatus.Pending, ct);

        if (existing)
        {
            await Send.ResponseAsync(Result<string>.Failure("Hali hazırda bekleyen bir başvurunuz bulunmaktadır."), 400, ct);
            return;
        }

        try
        {
            // 2. Dosyaları Güvenli Kaydet (Secure - Private)
            var certUrl = await fileService.SaveSecureDocumentAsync(req.ExemptionCertificate, "author_documents");
            var bankUrl = await fileService.SaveSecureDocumentAsync(req.BankDocument, "author_documents");

            // 3. Başvuruyu Oluştur
            var application = new PaidAuthorApplication
            {
                UserId = userId,
                GvkExemptionCertificateUrl = certUrl,
                BankAccountDocumentUrl = bankUrl,
                Iban = req.Iban,
                BankName = req.BankName,
                Status = ApplicationStatus.Pending
            };

            dbContext.PaidAuthorApplications.Add(application);
            await dbContext.SaveChangesAsync(ct);

            await Send.ResponseAsync(Result<string>.Success("Ücretli yazarlık başvurunuz başarıyla alınmıştır. Admin onayından sonra bildirim alacaksınız."), 200, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Başvuru sırasında hata oluştu: {ex.Message}"), 500, ct);
        }
    }
}
