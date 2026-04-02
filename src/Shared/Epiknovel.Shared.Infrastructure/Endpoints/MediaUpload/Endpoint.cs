using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Shared.Infrastructure.Endpoints.MediaUpload;

/// <summary>
/// Merkezi Medya İşleme ve Yükleme Merkezi. 
/// Tüm görselleri otomatik WebP formatına çevirir ve belirtilmişse ölçeklendirir.
/// </summary>
public class MediaUploadEndpoint(IFileService fileService) : FastEndpoints.Endpoint<Request, Result<Response>>
{
    // Belgeler (Local Secure Storage)
    public override void Configure()
    {
        Post("/media/upload");
        AllowFileUploads(); // Multipart desteği
        // Varsayılan olarak kimlik doğrulaması gerektirir
        Summary(s => {
            s.Summary = "Merkezi görsel yükleme ve optimizasyon servisi.";
            s.Description = "Gönderilen dosyaları otomatik WebP'ye çevirir (Auto-WebP, Quality 75%).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Temel Kontroller (Boyut ve Tip)
        if (req.File.Length == 0)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Dosya boş olamaz."), 400, ct);
            return;
        }

        if (req.File.Length > 20 * 1024 * 1024) // 20MB Limit
        {
            await Send.ResponseAsync(Result<Response>.Failure("Dosya boyutu 20MB'dan büyük olamaz."), 400, ct);
            return;
        }

        // 2. Güvenli Yükleme (Local Secure Storage)
        // GUID ile saklanır (Sanitization)

        try
        {
            var fileName = await fileService.SaveImageAsync(
                req.File, 
                req.Category.ToLower(), 
                req.Width ?? 0, 
                req.Height ?? 0);

            var url = fileService.GetFileUrl(fileName, req.Category.ToLower());

            await Send.ResponseAsync(Result<Response>.Success(new Response
            {
                Url = url,
                FileName = fileName
            }), 201, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<Response>.Failure($"Medya yüklenirken hata oluştu: {ex.Message}"), 500, ct);
        }
    }
}
