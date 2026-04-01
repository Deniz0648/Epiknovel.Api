using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using System.Linq;
using Microsoft.AspNetCore.OutputCaching;

using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Endpoints.UpdateBook;

[AuditLog("Kitap Güncellendi")]
public class Endpoint(
    BooksDbContext dbContext, 
    ISlugService slugService,
    IOutputCacheStore cacheStore) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Put("/books/{Id}");
        Policies(PolicyNames.AuthorContentAccess);
        // Varsayılan: kimlik doğrulaması zorunlu (AllowAnonymous kaldırıldı)
        Summary(s => {
            s.Summary = "Mevcut bir kitabı günceller.";
            s.Description = "Kitap başlığı değişirse Slug otomatik olarak yeniden üretilir. BOLA korumalıdır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 0. BOLA: Sadece kitabın sahibi güncelleyebilir
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var book = await dbContext.Books
            .Include(x => x.Categories)
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (book == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        if (book.AuthorId != userId)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bu kitabı güncelleme yetkiniz yok."), 403, ct);
            return;
        }

        if (book.Title != req.Title)
        {
            book.Title = req.Title;
            book.Slug = await slugService.GenerateUniqueSlugAsync(book.Title, dbContext.Books, ct);
        }
        book.Description = req.Description;

        book.CoverImageUrl = req.CoverImageUrl;
        book.Status = req.Status;
        book.ContentRating = req.ContentRating;

        // 2. Kategorileri Güncelle
        book.Categories.Clear();
        var categories = await dbContext.Categories
            .Where(x => req.CategoryIds.Contains(x.Id))
            .ToListAsync(ct);
        foreach (var category in categories) book.Categories.Add(category);

        // 3. Etiketleri Güncelle (N+1 önleme: tek sorguda mevcutları çek, eksikleri toplu oluştur)
        book.Tags.Clear();

        var normalizedTagNames = req.Tags
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedTagNames.Count > 0)
        {
            var existingTags = await dbContext.Tags
                .Where(t => normalizedTagNames.Contains(t.Name))
                .ToListAsync(ct);

            var existingTagNames = existingTags
                .Select(t => t.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingTags = normalizedTagNames
                .Where(tagName => !existingTagNames.Contains(tagName))
                .Select(tagName => new Tag
                {
                    Name = tagName,
                    Slug = Epiknovel.Shared.Core.Common.SlugHelper.ToSlug(tagName)
                })
                .ToList();

            if (missingTags.Count > 0)
            {
                dbContext.Tags.AddRange(missingTags);
            }

            foreach (var tag in existingTags)
            {
                book.Tags.Add(tag);
            }

            foreach (var tag in missingTags)
            {
                book.Tags.Add(tag);
            }
        }

        await dbContext.SaveChangesAsync(ct);
        await cacheStore.EvictByTagAsync("ChapterCache", ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Kitap başarıyla güncellendi.",
            Slug = book.Slug
        }), 200, ct);
    }
}
