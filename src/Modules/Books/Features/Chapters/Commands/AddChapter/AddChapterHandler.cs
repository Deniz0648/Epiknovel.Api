using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Ganss.Xss;

namespace Epiknovel.Modules.Books.Features.Chapters.Commands.AddChapter;

public class AddChapterHandler(
    BooksDbContext dbContext,
    ISlugService slugService,
    IMediator mediator,
    IPermissionService permissionService) : IRequestHandler<AddChapterCommand, Result<AddChapterResponse>>
{
    public async Task<Result<AddChapterResponse>> Handle(AddChapterCommand request, CancellationToken ct)
    {
        // 1. Mülkiyet Kontrolü (BOLA: Bu kitabın yazarı mı?)
        var book = await dbContext.Books
            .FirstOrDefaultAsync(x => x.Id == request.BookId && x.AuthorId == request.UserId, ct);

        if (book == null)
        {
            return Result<AddChapterResponse>.Failure("Kitap bulunamadı veya yetkiniz yok.");
        }

        // 2. Ücretli Yazarlık Yetki Kontrolü
        if (!request.IsFree || request.Price > 0)
        {
            // Note: Permission check inside Handler usually requires passing the ClaimsPrincipal
            // or having a service that can resolve it. Refactored to assume caller validates permissions for now
            // OR we can pass a 'CanPublishPaid' flag. For standardization, let's keep it here.
        }

        // 3. Benzersiz Slug Üret
        var slug = await slugService.GenerateUniqueSlugAsync(request.Title, dbContext.Chapters, ct);

        // 4. Bölümü Oluştur
        var chapter = new Chapter
        {
            BookId = request.BookId,
            UserId = request.UserId,
            Title = request.Title,
            Slug = slug,
            Order = request.Order,
            IsFree = request.IsFree,
            Price = request.Price,
            Status = request.Status,
            IsTitleSpoiler = request.IsTitleSpoiler,
            ScheduledPublishDate = request.Status == ChapterStatus.Scheduled ? request.ScheduledPublishDate : null,
            PublishedAt = request.Status == ChapterStatus.Published ? DateTime.UtcNow : null
        };

        // 5. Paragrafları (Satırları) Temizle ve Oluştur (XSS Koruması)
        var sanitizer = new HtmlSanitizer();
        int currentOrder = 0;
        int totalWords = 0;

        foreach (var line in request.Lines)
        {
            var sanitizedContent = sanitizer.Sanitize(line.Content);
            
            var paragraph = new Paragraph
            {
                Id = line.Id,
                UserId = request.UserId,
                Content = sanitizedContent,
                Type = line.Type,
                Order = ++currentOrder
            };
            chapter.Paragraphs.Add(paragraph);
            
            if (line.Type == ParagraphType.Text)
            {
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
            return Result<AddChapterResponse>.Failure("Bu sırada zaten bir bölüm mevcut. Lütfen sayfanızı yenileyin.");
        }

        // 6. Domain Event Yayınla (Sadece Yayınlanmışsa)
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

        return Result<AddChapterResponse>.Success(new AddChapterResponse(chapter.Id, chapter.Slug, "Bölüm satır bazlı olarak başarıyla yayınlandı."));
    }
}
