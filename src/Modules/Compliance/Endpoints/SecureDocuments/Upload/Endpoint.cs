using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Modules.Compliance.Domain;
using System.Security.Claims;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Compliance.Endpoints.SecureDocuments.Upload;

public class Request
{
    public IFormFile File { get; set; } = default!;
    public string Category { get; set; } = "compliance-docs";
}

public class Response
{
    public Guid DocumentId { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class Endpoint(ComplianceDbContext dbContext, IFileService fileService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/compliance/documents/upload");
        AllowFileUploads();
        Summary(s => {
            s.Summary = "Resmi doküman yükler (KYC, Vergi vb.)";
            s.Description = "Dosya binary olarak doğrulanır ve private ACL ile saklanır. Sadece sahibi erişebilir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Kullanıcı Kimlik Doğrulaması (Identity üzerinden - Mass Assignment korumalı)
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Oturum bulunamadı."), 401, ct);
            return;
        }

        var userId = Guid.Parse(userIdString);

        try
        {
            // 2. Güvenli Yükleme (S3 Private)
            // S3 içerisinde dosya GUID ile saklanır (Sanitization)
            var storedFileName = await fileService.SaveSecureDocumentAsync(req.File, req.Category);

            // 3. Veritabanı Kaydı (BOLA için temel)
            var document = new SecureDocument
            {
                UserId = userId,
                OriginalFileName = req.File.FileName,
                StoredFileName = storedFileName,
                Category = req.Category,
                MimeType = req.File.ContentType
            };

            dbContext.SecureDocuments.Add(document);
            await dbContext.SaveChangesAsync(ct);

            await Send.ResponseAsync(Result<Response>.Success(new Response
            {
                DocumentId = document.Id,
                Message = "Doküman başarıyla yüklendi ve mühürlendi."
            }), 201, ct);
        }
        catch (InvalidOperationException ex)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ex.Message), 400, ct);
        }
        catch (Exception)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Doküman işlenirken teknik bir hata oluştu."), 500, ct);
        }
    }
}
