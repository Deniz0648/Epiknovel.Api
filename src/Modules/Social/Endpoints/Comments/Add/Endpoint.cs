using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using MediatR;
using Epiknovel.Shared.Core.Events;
using Microsoft.AspNetCore.Builder;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Add;

public record Request
{
    public Guid? BookId { get; init; }
    public Guid? ChapterId { get; init; }
    public Guid? ParentCommentId { get; init; }
    public string Content { get; init; } = string.Empty;
}

[Epiknovel.Shared.Core.Attributes.AuditLog("Yorum Eklendi")]
public class Endpoint(
    SocialDbContext dbContext, 
    IMediator mediator, 
    Epiknovel.Shared.Core.Interfaces.Books.IBookProvider bookProvider) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/comments");
        Options(x => x.RequireRateLimiting("SocialPolicy"));
        Summary(s => {
            s.Summary = "Yeni bir yorum ekle.";
            s.Description = "Kitap, bölüm veya başka bir yoruma yeni bir yorum ekler (Dakikada 15 işlem limiti).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Unauthorized"), 401, ct);
            return;
        }

        if (req.BookId == null && req.ChapterId == null)
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Yorumun yapılacağı kitap veya bölüm belirtilmelidir."), 400, ct);
            return;
        }

        // Aktiflik Kontrolleri
        if (req.BookId.HasValue && !await bookProvider.IsBookActiveAsync(req.BookId.Value, ct))
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Kitap bulunamadı veya silinmiş."), 404, ct);
            return;
        }

        if (req.ChapterId.HasValue && !await bookProvider.IsChapterActiveAsync(req.ChapterId.Value, ct))
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Bölüm bulunamadı veya silinmiş."), 404, ct);
            return;
        }

        if (req.ParentCommentId.HasValue)
        {
            var parentExists = await dbContext.Comments.AnyAsync(c => c.Id == req.ParentCommentId.Value, ct);
            if (!parentExists)
            {
                await Send.ResponseAsync(Result<Guid>.Failure("Yanıtlanacak yorum bulunamadı."), 404, ct);
                return;
            }
        }

        // 3. Yorum Ekle (XSS Koruması)
        var sanitizer = new Ganss.Xss.HtmlSanitizer();
        var sanitizedContent = sanitizer.Sanitize(req.Content);

        var comment = new Comment
        {
            UserId = userId,
            BookId = req.BookId,
            ChapterId = req.ChapterId,
            ParentCommentId = req.ParentCommentId,
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

        await Send.ResponseAsync(Result<Guid>.Success(comment.Id), 200, ct);
    }
}
