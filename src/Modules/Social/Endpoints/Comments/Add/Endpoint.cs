using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Add;

public record Request
{
    public Guid? BookId { get; init; }
    public Guid? ChapterId { get; init; }
    public Guid? ParentCommentId { get; init; }
    public string Content { get; init; } = string.Empty;
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/comments");
        Summary(s => {
            s.Summary = "Yeni bir yorum ekle.";
            s.Description = "Kitap, bölüm veya başka bir yoruma (yanıt olarak) yeni bir yorum ekler.";
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

        var comment = new Comment
        {
            UserId = userId,
            BookId = req.BookId,
            ChapterId = req.ChapterId,
            ParentCommentId = req.ParentCommentId,
            Content = req.Content,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Comments.Add(comment);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(comment.Id), 200, ct);
    }
}
