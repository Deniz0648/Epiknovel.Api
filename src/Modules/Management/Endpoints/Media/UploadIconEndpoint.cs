using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Management.Endpoints.Media;

public class UploadIconRequest
{
    public IFormFile File { get; set; } = default!;
}

[AuditLog("Upload Icon")]
public class UploadIconEndpoint(IFileService fileService) : Endpoint<UploadIconRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/media/upload/icon");
        AllowFileUploads(); // FastEndpoints requirement
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UploadIconRequest req, CancellationToken ct)
    {
        if (req.File == null || req.File.Length == 0)
        {
            await Send.ResponseAsync(Result<string>.Failure("Gecersiz dosya."), 400, ct);
            return;
        }

        try
        {
            // Category "icons" uses (128x128, ResizeMode.Crop) policy in LocalFileService
            var fileName = await fileService.SaveImageAsync(req.File, "icons");
            var url = fileService.GetFileUrl(fileName, "icons");

            await Send.ResponseAsync(Result<string>.Success(url, "Icon yuklendi."), 200, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Yukleme hatasi: {ex.Message}"), 500, ct);
        }
    }
}
