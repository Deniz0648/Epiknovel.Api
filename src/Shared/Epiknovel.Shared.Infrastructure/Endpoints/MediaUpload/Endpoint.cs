using FastEndpoints;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Shared.Infrastructure.Features.Media.Commands.UploadImage;

namespace Epiknovel.Shared.Infrastructure.Endpoints.MediaUpload;

/// <summary>
/// Merkezi Medya İşleme ve Yükleme Merkezi. 
/// Tüm görselleri otomatik WebP formatına çevirir ve belirtilmişse ölçeklendirir.
/// </summary>
public class MediaUploadEndpoint(IMediator mediator) : FastEndpoints.Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/media/upload");
        AllowFileUploads(); // Multipart desteği
        Summary(s => {
            s.Summary = "Merkezi görsel yükleme ve optimizasyon servisi.";
            s.Description = "Gönderilen dosyaları otomatik WebP'ye çevirir. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await mediator.Send(new UploadImageCommand(
            req.File,
            req.Category,
            req.Width,
            req.Height
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Url = result.Data!.Url,
            FileName = result.Data.FileName
        }), 201, ct);
    }
}
