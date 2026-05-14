using FastEndpoints;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.StaticFiles;

namespace Epiknovel.Shared.Infrastructure.Endpoints.GetImage;

public class Request
{
    [QueryParam]
    public string Path { get; set; } = default!;
    
    [QueryParam]
    public int? W { get; set; }
}

public class Endpoint(IWebHostEnvironment env) : Endpoint<Request>
{
    public override void Configure()
    {
        Get("/media/image");
        AllowAnonymous();
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(req.Path))
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // 1. Path Normalizasyonu (Güvenlik için .. ve benzeri saldırıları engelle)
        var cleanPath = NormalizePath(req.Path);
        
        // 2. Fiziksel Yol
        var publicUploadsPath = System.IO.Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
        if (!Directory.Exists(publicUploadsPath))
        {
            publicUploadsPath = System.IO.Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        }

        var filePath = System.IO.Path.Combine(publicUploadsPath, cleanPath);

        // 3. AOT Varyasyonu Kontrolü (w parametresi varsa)
        if (req.W.HasValue && (req.W == 100 || req.W == 200 || req.W == 300 || req.W == 450 || req.W == 600))
        {
            var dir = System.IO.Path.GetDirectoryName(filePath)!;
            var name = System.IO.Path.GetFileNameWithoutExtension(filePath);
            var ext = System.IO.Path.GetExtension(filePath);
            var variationPath = System.IO.Path.Combine(dir, $"{name}_{req.W}w{ext}");

            if (System.IO.File.Exists(variationPath))
            {
                filePath = variationPath;
            }
        }

        if (!System.IO.File.Exists(filePath))
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // 4. İçerik Türü (Mime Type)
        new FileExtensionContentTypeProvider().TryGetContentType(filePath, out var contentType);
        contentType ??= "application/octet-stream";

        // 5. Dosyayı Stream Et
        await Send.FileAsync(new System.IO.FileInfo(filePath), contentType, cancellation: ct);
    }

    private string NormalizePath(string path)
    {
        // Path traversal ve kirlilik temizliği
        var decoded = System.Net.WebUtility.UrlDecode(path)
            .Replace("\\", "/")
            .Replace("//", "/");

        // "uploads/" prefixini temizle (eğer varsa)
        if (decoded.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
            decoded = decoded.Substring(8);
        
        return decoded.Replace("..", "").TrimStart('/');
    }
}
