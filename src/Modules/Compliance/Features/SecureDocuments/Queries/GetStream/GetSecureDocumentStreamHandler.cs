using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Compliance.Features.SecureDocuments.Queries.GetStream;

public class GetSecureDocumentStreamHandler(
    ComplianceDbContext dbContext,
    IFileService fileService) : IRequestHandler<GetSecureDocumentStreamQuery, Result<SecureDocumentStreamResponse>>
{
    public async Task<Result<SecureDocumentStreamResponse>> Handle(GetSecureDocumentStreamQuery request, CancellationToken ct)
    {
        var document = await dbContext.SecureDocuments
            .FirstOrDefaultAsync(x => x.Id == request.DocumentId, ct);

        if (document == null)
        {
            return Result<SecureDocumentStreamResponse>.Failure("Doküman bulunamadı.");
        }

        // BOLA + Admin Check
        if (document.UserId != request.UserId && !request.HasAdminAccess)
        {
            return Result<SecureDocumentStreamResponse>.Failure("Bu dokümanı görüntüleme yetkiniz yok.");
        }

        try
        {
            var stream = await fileService.GetSecureFileStreamAsync(document.StoredFileName, document.Category);
            
            return Result<SecureDocumentStreamResponse>.Success(new SecureDocumentStreamResponse(
                stream,
                document.OriginalFileName,
                document.MimeType
            ));
        }
        catch (FileNotFoundException)
        {
            return Result<SecureDocumentStreamResponse>.Failure("Dosya fiziksel olarak bulunamadı.");
        }
        catch (Exception ex)
        {
            return Result<SecureDocumentStreamResponse>.Failure($"Dosya okunurken hata oluştu: {ex.Message}");
        }
    }
}
