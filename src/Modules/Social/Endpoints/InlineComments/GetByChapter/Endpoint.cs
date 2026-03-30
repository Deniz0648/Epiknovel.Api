using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Social.Endpoints.InlineComments.GetByChapter;

public record Request
{
    public Guid ChapterId { get; init; }
}

public record InlineCommentGroup
{
    public Guid ParagraphId { get; init; }
    public int CommentCount { get; init; }
    public List<InlineCommentResponse> Comments { get; init; } = new();
}

public record InlineCommentResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string Content { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<List<InlineCommentGroup>>>
{
    public override void Configure()
    {
        Get("/social/inline-comments/chapter/{chapterId}");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Bölüme ait satır yorumlarını getir.";
            s.Description = "Bir bölümdeki tüm paragraflara yapılmış yorumları paragraf bazlı gruplanmış şekilde getirir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // Bölüme ait tüm satır yorumlarını çekip paragraf bazlı grupla
        var inlineComments = await dbContext.InlineComments
            .Where(c => c.ChapterId == req.ChapterId && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct);

        var grouped = inlineComments
            .GroupBy(c => c.ParagraphId)
            .Select(g => new InlineCommentGroup
            {
                ParagraphId = g.Key,
                CommentCount = g.Count(),
                Comments = g.Select(c => new InlineCommentResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt
                }).ToList()
            })
            .ToList();

        await Send.ResponseAsync(Result<List<InlineCommentGroup>>.Success(grouped), 200, ct);
    }
}
