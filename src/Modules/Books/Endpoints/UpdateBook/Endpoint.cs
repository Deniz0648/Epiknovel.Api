using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using System.Linq;
using Microsoft.AspNetCore.OutputCaching;

using Epiknovel.Shared.Core.Attributes;

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

        // 1. Title değiştiyse Slug güncelle
        if (book.Title != req.Title)
        {
            book.Title = req.Title;
            book.Slug = await slugService.GenerateUniqueSlugAsync(req.Title, dbContext.Books, ct);
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

        // 3. Etiketleri Güncelle
        book.Tags.Clear();
        foreach (var tagName in req.Tags)
        {
            var tag = await dbContext.Tags.FirstOrDefaultAsync(t => t.Name == tagName, ct);
            if (tag == null)
            {
                tag = new Tag { Name = tagName, Slug = Epiknovel.Shared.Core.Common.SlugHelper.ToSlug(tagName) };
            }
            book.Tags.Add(tag);
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
