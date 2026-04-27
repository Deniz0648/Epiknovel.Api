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
    public string ParagraphId { get; init; } = string.Empty;
    public int CommentCount { get; init; }
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
        // Not: Yeni yapıda yorumlar 'Comments' tablosunda tutuluyor.
        var counts = await dbContext.Comments
            .AsNoTracking()
            .Where(c => c.ChapterId == req.ChapterId && c.ParagraphId != null && !c.IsDeleted && !c.IsHidden)
            .GroupBy(c => c.ParagraphId)
            .Select(g => new InlineCommentGroup
            {
                ParagraphId = g.Key!,
                CommentCount = g.Count()
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<InlineCommentGroup>>.Success(counts), 200, ct);
    }
}
