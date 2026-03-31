using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Attributes;

using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;

namespace Epiknovel.Modules.Books.Endpoints.AddChapter;

[AuditLog("Bölüm Yayınlandı (Satır Bazlı)")]
public class Endpoint(
    BooksDbContext dbContext, 
    ISlugService slugService, 
    IMediator mediator,
    IUserProvider userProvider) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books/chapters");
        // Varsayılan olarak kimlik doğrulaması gerektirir (AllowAnonymous çağrılmadıkça)
        Summary(s => {
            s.Summary = "Bir kitaba yeni bir bölüm ekler.";
            s.Description = "İçeriği paragraflar halinde (satır bazlı) saklar. BOLA mülkiyet kontrolü içerir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Mülkiyet Kontrolü (BOLA: Bu kitabın yazarı mı?)
        var book = await dbContext.Books
            .FirstOrDefaultAsync(x => x.Id == req.BookId && x.AuthorId == req.UserId, ct);

        if (book == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı veya yetkiniz yok."), 404, ct);
            return;
        }

        // 2. Ücretli Yazarlık Yetki Kontrolü
        if (!req.IsFree || req.Price > 0)
        {
            var isPaidAuthor = await userProvider.IsPaidAuthorAsync(req.UserId, ct);
            if (!isPaidAuthor)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Ücretli bölüm yayınlamak için önce başvurup onay almalısınız."), 403, ct);
                return;
            }
        }

        // 3. Benzersiz Slug Üret
        var slug = await slugService.GenerateUniqueSlugAsync(req.Title, dbContext.Chapters, ct);

        // 3. Bölümü Oluştur
        var chapter = new Chapter
        {
            BookId = req.BookId,
            UserId = req.UserId,
            Title = req.Title,
            Slug = slug,
            Order = req.Order,
            IsFree = req.IsFree,
            Price = req.Price,
            Status = req.Status,
            IsTitleSpoiler = req.IsTitleSpoiler,
            ScheduledPublishDate = req.Status == ChapterStatus.Scheduled ? req.ScheduledPublishDate : null,
            PublishedAt = req.Status == ChapterStatus.Published ? DateTime.UtcNow : null
        };

        // 4. Paragrafları (Satırları) Temizle ve Oluştur (XSS Koruması)
        var sanitizer = new Ganss.Xss.HtmlSanitizer();
        int currentOrder = 0;
        int totalWords = 0;

        foreach (var line in req.Lines)
        {
            var sanitizedContent = sanitizer.Sanitize(line.Content);
            
            var paragraph = new Paragraph
            {
                Id = Guid.NewGuid(),
                UserId = req.UserId,
                Content = sanitizedContent,
                Type = line.Type,
                Order = ++currentOrder
            };
            chapter.Paragraphs.Add(paragraph);
            
            if (line.Type == ParagraphType.Text)
            {
                // Daha hassas kelime sayımı (Sanitize edilmiş metin üzerinden)
                totalWords += sanitizedContent.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
            }
        }

        chapter.WordCount = totalWords;
        dbContext.Chapters.Add(chapter);
        
        try 
        {
            await dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Race Condition: BookId + Order çakışması
            await Send.ResponseAsync(Result<Response>.Failure("Bu sırada zaten bir bölüm mevcut. Lütfen sayfanızı yenileyin."), 400, ct);
            return;
        }

        // 5. Domain Event Yayınla (Sadece Yayınlanmışsa)
        if (chapter.Status == ChapterStatus.Published)
        {
            await mediator.Publish(new ChapterPublishedEvent(
                chapter.BookId,
                chapter.Id,
                chapter.Title,
                chapter.Slug,
                chapter.UserId,
                chapter.PublishedAt ?? DateTime.UtcNow), ct);
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Id = chapter.Id,
            Slug = chapter.Slug,
            Message = "Bölüm satır bazlı olarak başarıyla yayınlandı."
        }), 201, ct);
    }
}

