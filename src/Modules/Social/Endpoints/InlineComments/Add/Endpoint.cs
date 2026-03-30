using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.InlineComments.Add;

public record Request
{
    public Guid ChapterId { get; init; }
    public Guid ParagraphId { get; init; } // Metin içindeki spesifik paragraf/satır ID'si
    public string Content { get; init; } = string.Empty;
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/inline-comments");
        Summary(s => {
            s.Summary = "Paragraf bazlı (inline) yorum ekle.";
            s.Description = "Bölüm içindeki spesifik bir paragrafa/satıra yorum yapılmasını sağlar.";
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

        var comment = new InlineComment
        {
            UserId = userId,
            ChapterId = req.ChapterId,
            ParagraphId = req.ParagraphId,
            Content = req.Content,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.InlineComments.Add(comment);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(comment.Id), 200, ct);
    }
}
