using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Caching.Distributed;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Books.Endpoints.GetChapter;

public class Endpoint(
    BooksDbContext dbContext, 
    StackExchange.Redis.IConnectionMultiplexer redis,
    IMediator mediator) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/books/chapters/{Slug}");
        AllowAnonymous();
        Options(x => x.WithMetadata(new Microsoft.AspNetCore.OutputCaching.OutputCacheAttribute { Duration = 60, Tags = new[] { "ChapterCache" } }));
        Summary(s => {
            s.Summary = "Bir kitabın bölüm içeriğini getirir.";
            s.Description = "İçeriği satır bazlı döner. İzlenme sayıları ve okuma geçmişi arka planda güncellenir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Bölümü ve sıralı paragrafları getir
        var chapter = await dbContext.Chapters
            .AsNoTracking()
            .Include(x => x.Paragraphs.OrderBy(p => p.Order))
            .FirstOrDefaultAsync(x => x.Slug == req.Slug, ct);

        if (chapter == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // 2. Response hazırla
        var response = new Response
        {
            Id = chapter.Id,
            Title = chapter.Title,
            WordCount = chapter.WordCount,
            Order = chapter.Order,
            PublishedAt = chapter.PublishedAt ?? DateTime.UtcNow,
            Paragraphs = chapter.Paragraphs.Select(p => new ParagraphDto
            {
                Id = p.Id,
                Content = p.Content,
                Type = p.Type.ToString(),
                Order = p.Order
            }).ToList()
        };

        // 3. Arka Plan İşlemleri: İzlenme Sayısı ve Okuma Geçmişi
        _ = Task.Run(async () => {
            try 
            {
                var db = redis.GetDatabase();
                var chapterIdStr = chapter.Id.ToString();
                
                // A. İzlenme Sayısını Artır (Redis)
                await db.StringIncrementAsync($"chapter:hits:{chapterIdStr}");
                await db.SetAddAsync("chapters:dirty", chapterIdStr);

                // B. Okuma Geçmişini Güncelle (Eğer kullanıcı giriş yapmışsa)
                var userIdStr = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
                if (!string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var userId))
                {
                    await mediator.Publish(new Epiknovel.Shared.Core.Events.ChapterReadEvent(
                        chapter.BookId,
                        chapter.Id,
                        userId,
                        0, // İlk açılışta %0
                        DateTime.UtcNow));
                }
            }
            catch { /* Hatalar ana akışı bozmamalı */ }
        }, ct);

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}


