using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;

using MediatR;
using Microsoft.AspNetCore.OutputCaching;

namespace Epiknovel.Modules.Books.Endpoints.DeleteChapter;

[AuditLog("Bölüm Çöpe Taşındı")]
public class Endpoint(
    BooksDbContext dbContext, 
    IMediator mediator, 
    IOutputCacheStore cacheStore,
    Epiknovel.Shared.Infrastructure.Cache.IChapterCacheService chapterCache) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Delete("/books/chapters/{Id}");
        Summary(s => {
            s.Summary = "Mevcut bir bölümü çöp kutusuna taşır.";
            s.Description = "Hard delete yapılmaz. Veri korunur. (BOLA Korunmalı).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Bölümü Getir (BOLA: Kendi bölümü mü?)
        var chapter = await dbContext.Chapters
            .FirstOrDefaultAsync(x => x.Id == req.Id && x.UserId == req.UserId, ct);

        if (chapter == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bölüm bulunamadı veya yetkiniz yok."), 404, ct);
            return;
        }

        // 🚀 ASENKRON ARŞİVLEME (Technical Decision 3)
        // Bölümü paragraflarıyla birlikte çek ve yedekle
        var fullChapterData = await dbContext.Chapters
            .AsNoTracking()
            .Include(x => x.Paragraphs)
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        
        if (fullChapterData != null)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(fullChapterData);
            await mediator.Publish(new Epiknovel.Shared.Core.Events.DataArchivedEvent(
                "Chapter",
                req.Id,
                json,
                req.UserId,
                DateTime.UtcNow), ct);
        }

        // 2. Soft Delete (Trash)
        chapter.IsDeleted = true;
        chapter.DeletedAt = DateTime.UtcNow;
        chapter.DeletedByUserId = req.UserId;

        await dbContext.SaveChangesAsync(ct);
        
        // 3. Cache Eviction
        await cacheStore.EvictByTagAsync("ChapterCache", ct);
        await chapterCache.RemoveChapterAsync(chapter.Slug);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Bölüm başarıyla çöp kutusuna taşındı."
        }), 200, ct);
    }
}

