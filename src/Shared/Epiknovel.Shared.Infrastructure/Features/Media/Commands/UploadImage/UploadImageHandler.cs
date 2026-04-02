using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Shared.Infrastructure.Features.Media.Commands.UploadImage;

public class UploadImageHandler(IFileService fileService) : IRequestHandler<UploadImageCommand, Result<UploadImageResponse>>
{
    public async Task<Result<UploadImageResponse>> Handle(UploadImageCommand request, CancellationToken ct)
    {
        // 1. Basic Checks
        if (request.File.Length == 0)
        {
            return Result<UploadImageResponse>.Failure("Dosya boş olamaz.");
        }

        if (request.File.Length > 20 * 1024 * 1024) // 20MB
        {
            return Result<UploadImageResponse>.Failure("Dosya boyutu 20MB'dan büyük olamaz.");
        }

        try
        {
            // 2. Offload processing to background (background processing queue is IN the service)
            var fileName = await fileService.SaveImageAsync(
                request.File, 
                request.Category.ToLower(), 
                request.Width ?? 0, 
                request.Height ?? 0);

            var url = fileService.GetFileUrl(fileName, request.Category.ToLower());

            return Result<UploadImageResponse>.Success(new UploadImageResponse(url, fileName));
        }
        catch (Exception ex)
        {
            return Result<UploadImageResponse>.Failure($"Medya yüklenirken hata oluştu: {ex.Message}");
        }
    }
}
