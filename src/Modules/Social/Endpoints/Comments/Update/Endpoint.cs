using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Update;

public record Request
{
    public Guid CommentId { get; init; }
    public string Content { get; init; } = string.Empty;
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Put("/social/comments/{commentId}");
        Summary(s => {
            s.Summary = "Yorumu güncelle.";
            s.Description = "Kullanıcının kendi yaptığı bir yorumun içeriğini değiştirmesini sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // Karakter Sınırı Kontrolü (Örn: 2000 karakter)
        if (req.Content.Length > 2000)
        {
            await Send.ResponseAsync(Result<string>.Failure("Yorum çok uzun (Maks: 2000 karakter)."), 400, ct);
            return;
        }

        var comment = await dbContext.Comments
            .FirstOrDefaultAsync(c => c.Id == req.CommentId, ct);

        if (comment == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Yorum bulunamadı."), 404, ct);
            return;
        }

        if (comment.UserId != userId)
        {
            await Send.ResponseAsync(Result<string>.Failure("Sadece kendi yorumunuzu güncelleyebilirsiniz."), 403, ct);
            return;
        }

        comment.Content = req.Content;
        comment.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Yorum güncellendi."), 200, ct);
    }
}
