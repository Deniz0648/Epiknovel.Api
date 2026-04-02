using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces.Books;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Ganss.Xss;

namespace Epiknovel.Modules.Social.Features.Comments.Commands.AddComment;

public class AddCommentHandler(
    SocialDbContext dbContext,
    IMediator mediator,
    IBookProvider bookProvider) : IRequestHandler<AddCommentCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(AddCommentCommand request, CancellationToken ct)
    {
        if (request.BookId == null && request.ChapterId == null)
        {
            return Result<Guid>.Failure("Yorumun yapılacağı kitap veya bölüm belirtilmelidir.");
        }

        // Aktiflik Kontrolleri
        if (request.BookId.HasValue && !await bookProvider.IsBookActiveAsync(request.BookId.Value, ct))
        {
            return Result<Guid>.Failure("Kitap bulunamadı veya silinmiş.");
        }

        if (request.ChapterId.HasValue && !await bookProvider.IsChapterActiveAsync(request.ChapterId.Value, ct))
        {
            return Result<Guid>.Failure("Bölüm bulunamadı veya silinmiş.");
        }

        if (request.ParentCommentId.HasValue)
        {
            var parentExists = await dbContext.Comments.AnyAsync(c => c.Id == request.ParentCommentId.Value, ct);
            if (!parentExists)
            {
                return Result<Guid>.Failure("Yanıtlanacak yorum bulunamadı.");
            }
        }

        // 3. Yorum Ekle (XSS Koruması)
        var sanitizer = new HtmlSanitizer();
        var sanitizedContent = sanitizer.Sanitize(request.Content);

        var comment = new Comment
        {
            UserId = request.UserId,
            BookId = request.BookId,
            ChapterId = request.ChapterId,
            ParentCommentId = request.ParentCommentId,
            Content = sanitizedContent,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Comments.Add(comment);
        await dbContext.SaveChangesAsync(ct);

        // Olay Tetikleme (Asenkron bildirimler için)
        await mediator.Publish(new CommentCreatedEvent(
            comment.Id,
            comment.UserId,
            comment.BookId,
            comment.ChapterId,
            comment.Content,
            comment.CreatedAt), ct);

        return Result<Guid>.Success(comment.Id);
    }
}
