using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Books;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Endpoints.Admin.Comments;

public class GetBookSocialActivityRequest
{
    public Guid BookId { get; set; }
}

public class BookSocialActivityDto
{
    public List<SocialItemDto> Reviews { get; set; } = new();
    public List<SocialItemDto> ChapterComments { get; set; } = new();
    public List<SocialItemDto> InlineComments { get; set; } = new();
}

public class SocialItemDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ChapterTitle { get; set; }
    public int? LikeCount { get; set; }
    public bool IsHidden { get; set; }
}

[AuditLog("Get Book Social Activity for Compliance")]
public class GetBookSocialActivityEndpoint(SocialDbContext dbContext, IBookProvider bookProvider) : Endpoint<GetBookSocialActivityRequest, Result<BookSocialActivityDto>>
{
    public override void Configure()
    {
        Get("/social/admin/books/{BookId}/activity");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(GetBookSocialActivityRequest req, CancellationToken ct)
    {
        var chapterIds = await bookProvider.GetChapterIdsByBookIdAsync(req.BookId, ct);

        var reviews = await dbContext.Reviews
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(r => r.BookId == req.BookId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new SocialItemDto
            {
                Id = r.Id,
                UserId = r.UserId,
                Content = r.Content,
                CreatedAt = r.CreatedAt,
                LikeCount = r.LikeCount,
                IsHidden = r.IsHidden
            })
            .ToListAsync(ct);

        var comments = await dbContext.Comments
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(c => c.BookId == req.BookId || (c.ChapterId != null && chapterIds.Contains(c.ChapterId.Value)))
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new SocialItemDto
            {
                Id = c.Id,
                UserId = c.UserId,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                LikeCount = c.LikeCount,
                IsHidden = c.IsHidden
            })
            .ToListAsync(ct);

        var inlineComments = await dbContext.InlineComments
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(ic => chapterIds.Contains(ic.ChapterId))
            .OrderByDescending(ic => ic.CreatedAt)
            .Select(ic => new SocialItemDto
            {
                Id = ic.Id,
                UserId = ic.UserId,
                Content = ic.Content,
                CreatedAt = ic.CreatedAt,
                LikeCount = ic.LikeCount,
                IsHidden = ic.IsHidden
            })
            .ToListAsync(ct);

        var response = new BookSocialActivityDto
        {
            Reviews = reviews,
            ChapterComments = comments,
            InlineComments = inlineComments
        };

        await Send.ResponseAsync(Result<BookSocialActivityDto>.Success(response), 200, ct);
    }
}
