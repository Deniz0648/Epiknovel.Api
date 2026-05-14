using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Background;

namespace Epiknovel.Modules.Books.Endpoints.Maintenance;

public class GenerateImageVariationsEndpoint(
    BooksDbContext dbContext, 
    IImageProcessingQueue imageQueue,
    Microsoft.AspNetCore.Hosting.IWebHostEnvironment env) : EndpointWithoutRequest<Result<string>>
{
    public override void Configure()
    {
        Get("/books/maintenance/generate-variations");
        AllowAnonymous(); // Geçici olarak test için
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var books = await dbContext.Books
            .Where(b => !string.IsNullOrEmpty(b.CoverImageUrl))
            .ToListAsync(ct);

        int processedCount = 0;
        int skippedCount = 0;
        int notFoundCount = 0;

        var publicUploadsPath = Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
        if (!Directory.Exists(publicUploadsPath))
        {
            publicUploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        }

        foreach (var book in books)
        {
            var cleanPath = NormalizeImagePath(book.CoverImageUrl);
            var originalPath = Path.Combine(publicUploadsPath, cleanPath);

            if (!File.Exists(originalPath))
            {
                notFoundCount++;
                continue;
            }

            var dir = Path.GetDirectoryName(originalPath)!;
            var name = Path.GetFileNameWithoutExtension(originalPath);
            var ext = Path.GetExtension(originalPath);

            // Tüm varyasyonların olup olmadığını kontrol et (100, 200, 300, 450, 600)
            bool allExist = true;
            var targetWidths = new[] { 100, 200, 300, 450, 600 };
            foreach (var w in targetWidths)
            {
                if (!File.Exists(Path.Combine(dir, $"{name}_{w}w{ext}")))
                {
                    allExist = false;
                    break;
                }
            }

            if (allExist)
            {
                skippedCount++;
                continue;
            }

            // Orijinal dosyayı "temp" klasörüne kopyalamadan, ImageProcessingWorker'ın orijinali silmemesi için
            // geçici bir kopyasını temp'e alıp kuyruğa gönderiyoruz.
            var tempDir = Path.Combine(publicUploadsPath, "temp");
            if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);
            
            var tempPath = Path.Combine(tempDir, $"{Guid.NewGuid():N}.tmp");
            File.Copy(originalPath, tempPath);

            await imageQueue.EnqueueAsync(new ImageProcessingTask(
                OriginalPath: tempPath, 
                TargetPath: originalPath, 
                Width: 0, 
                Height: 0, 
                Mode: SixLabors.ImageSharp.Processing.ResizeMode.Max, 
                WidthVariations: targetWidths));

            processedCount++;

            // CPU'yu boğmamak için ufak bekleme
            await Task.Delay(50, ct);
        }

        await Send.OkAsync(Result<string>.Success($"Migrasyon tamamlandı. İşleme alınan: {processedCount}, Atlanan: {skippedCount}, Bulunamayan: {notFoundCount}"), ct);
    }

    private string NormalizeImagePath(string? path)
    {
        if (string.IsNullOrEmpty(path)) return string.Empty;

        var decoded = System.Net.WebUtility.UrlDecode(path)
            .Replace("\\", "/")
            .Replace("//", "/");

        if (decoded.Contains('?'))
        {
            var parts = decoded.Split("path=");
            if (parts.Length > 1) decoded = parts[1].Split('&')[0];
            else decoded = decoded.Split('?')[0];
        }

        var clean = decoded.TrimStart('/');
        var uploadsSegments = new[] { 
            "wwwroot/uploads/", "wwwroot/upload/", 
            "uploads/covers/", "uploads/cover/",
            "upload/covers/", "upload/cover/",
            "uploads/", "upload/" 
        };
        
        foreach (var segment in uploadsSegments)
        {
            if (clean.StartsWith(segment, StringComparison.OrdinalIgnoreCase))
            {
                clean = clean.Substring(segment.Length);
            }
        }

        return clean.Replace("..", "").TrimStart('/');
    }
}
