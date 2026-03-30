using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Compliance.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Compliance.Endpoints.SecureDocuments.Download;

public class Request
{
    public Guid Id { get; set; }
}

public class Endpoint(ComplianceDbContext dbContext, IFileService fileService) : Endpoint<Request>
{
    public override void Configure()
    {
        Get("/compliance/documents/{id}/download");
        Summary(s => {
            s.Summary = "Gizli dokümanı stream olarak indirir.";
            s.Description = "BOLA Korumalıdır: Dosya yayın klasörü dışından güvenli şekilde okunur ve tarayıcıya basılır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Kullanıcı Bilgisini Al
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString))
        {
            await Send.UnauthorizedAsync(ct);
            return;
        }

        var userId = Guid.Parse(userIdString);
        var isAdmin = User.IsInRole("Admin");

        // 2. BOLA Korumalı Sorgu
        var document = await dbContext.SecureDocuments
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (document == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // 3. Yetki Kontrolü (BOLA)
        if (document.UserId != userId && !isAdmin)
        {
            await Send.ForbiddenAsync(ct);
            return;
        }

        // 4. Dosyayı Diskten Oku ve Stream Olarak Dön (Direct Access Koruması)
        try
        {
            var stream = await fileService.GetSecureFileStreamAsync(document.StoredFileName, document.Category);
            
            await Send.StreamAsync(
                stream, 
                fileName: document.OriginalFileName, 
                fileLengthBytes: null, 
                contentType: document.MimeType, 
                cancellation: ct);
        }
        catch (FileNotFoundException)
        {
            await Send.NotFoundAsync(ct);
        }
    }
}
