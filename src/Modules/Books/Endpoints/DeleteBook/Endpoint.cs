using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;
using Microsoft.AspNetCore.OutputCaching;
using System.Security.Claims;
using MediatR;

namespace Epiknovel.Modules.Books.Endpoints.DeleteBook;

[AuditLog("Kitap Çöpe Taşındı")]
public class Endpoint(
    BooksDbContext dbContext, 
    IOutputCacheStore cacheStore, 
    IMediator mediator,
    Epiknovel.Shared.Infrastructure.Cache.IChapterCacheService chapterCache) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Delete("/books/{Id}");
        Summary(s => {
            s.Summary = "Mevcut bir kitabı çöp kutusuna taşır.";
            s.Description = "Hard delete yapılmaz. Bulk update ile yüksek performanslı silme işlemi gerçekleştirir. BOLA Korunmalıdır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Yetki Kontrolü (BOLA)
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // Sahiplik doğrula (Varlığı değil sadece IDsini çekiyoruz, bellek tasarrufu)
        var bookData = await dbContext.Books
            .Where(x => x.Id == req.Id)
            .Select(x => new { x.Id, x.AuthorId })
            .FirstOrDefaultAsync(ct);

        if (bookData == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        if (bookData.AuthorId != userId)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bu işlem için yetkiniz yok."), 403, ct);
            return;
        }

        // 🚀 ASENKRON ARŞİVLEME (Technical Decision 3)
        // Veriyi bir kez çekip JSON olarak logluyoruz (Asenkron işlenecek)
        var fullBookData = await dbContext.Books
            .AsNoTracking()
            .Include(x => x.Categories)
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        
        if (fullBookData != null)
        {
            var serializeOptions = new System.Text.Json.JsonSerializerOptions
            {
                ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles,
                WriteIndented = false
            };
            var json = System.Text.Json.JsonSerializer.Serialize(fullBookData, serializeOptions);
            await mediator.Publish(new Epiknovel.Shared.Core.Events.DataArchivedEvent(
                "Book",
                req.Id,
                json,
                userId,
                DateTime.UtcNow), ct);
        }

        // 2. Ölçeklenebilir Soft Delete...
        var now = DateTime.UtcNow;

        // Önce bölümleri toplu silindi olarak işaretle
        await dbContext.Chapters
            .Where(c => c.BookId == req.Id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.IsDeleted, true)
                .SetProperty(c => c.DeletedAt, now)
                .SetProperty(c => c.DeletedByUserId, userId), ct);

        // Sonra kitabı silindi olarak işaretle
        await dbContext.Books
            .Where(b => b.Id == req.Id)
            .ExecuteUpdateAsync(b => b
                .SetProperty(x => x.IsDeleted, true)
                .SetProperty(x => x.DeletedAt, now)
                .SetProperty(x => x.DeletedByUserId, userId), ct);

        // 3. Cache Eviction (Önbellek temizliği)
        await cacheStore.EvictByTagAsync("BookCache", ct);
        await cacheStore.EvictByTagAsync("ChapterCache", ct);
        await cacheStore.EvictByTagAsync($"BookDetails_{req.Id}", ct);

        // 🚀 ÖZEL BINARY CACIHE TEMİZLİĞİ (Technical Decision 1 Fix)
        // Kitaba bağlı tüm bölümlerin binary cache'lerini temizle
        var chapterSlugs = await dbContext.Chapters
            .IgnoreQueryFilters() // Silinmiş olarak işaretlediğimiz için ignore etmeliyiz
            .Where(c => c.BookId == req.Id)
            .Select(c => c.Slug)
            .ToListAsync(ct);

        foreach (var slug in chapterSlugs)
        {
            await chapterCache.RemoveChapterAsync(slug);
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Kitap ve tüm bölümleri başarıyla çöp kutusuna taşındı."
        }), 200, ct);
    }
}


