using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
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
    public List<SocialItemDto> BookComments { get; set; } = new();
    public List<SocialItemDto> ChapterComments { get; set; } = new();
    public List<SocialItemDto> InlineComments { get; set; } = new();
}

public class SocialItemDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserName { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int LikeCount { get; set; }
    public bool IsHidden { get; set; }
    public bool IsEditorChoice { get; set; }
    public Guid? ChapterId { get; set; }
    public string? ParagraphId { get; set; }
    public Guid? ParentId { get; set; }
    public bool IsSpoiler { get; set; }
    public double Rating { get; set; }
}

[AuditLog("Get Book Social Activity for Compliance")]
public class GetBookSocialActivityEndpoint(SocialDbContext dbContext, IBookProvider bookProvider, IUserProvider userProvider) : Endpoint<GetBookSocialActivityRequest, Result<BookSocialActivityDto>>
{
    public override void Configure()
    {
        Get("/social/admin/books/{BookId}/activity");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(GetBookSocialActivityRequest req, CancellationToken ct)
    {
        try
        {
            var chapterIds = await bookProvider.GetChapterIdsByBookIdAsync(req.BookId, ct) ?? new List<Guid>();

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
                    IsHidden = r.IsHidden,
                    IsEditorChoice = r.IsEditorChoice,
                    IsSpoiler = r.IsSpoiler
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
                    ChapterId = c.ChapterId,
                    ParagraphId = c.ParagraphId,
                    ParentId = c.ParentCommentId,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt,
                    LikeCount = c.LikeCount,
                    IsHidden = c.IsHidden,
                    IsEditorChoice = c.IsEditorChoice,
                    IsSpoiler = c.IsSpoiler
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
                    ChapterId = ic.ChapterId,
                    ParagraphId = ic.ParagraphId.ToString(),
                    Content = ic.Content,
                    CreatedAt = ic.CreatedAt,
                    LikeCount = ic.LikeCount,
                    IsHidden = ic.IsHidden,
                    IsSpoiler = ic.IsSpoiler
                })
                .ToListAsync(ct);

            var response = new BookSocialActivityDto
            {
                Reviews = reviews,
                BookComments = comments.Where(c => c.ChapterId == null && string.IsNullOrWhiteSpace(c.ParagraphId)).ToList(),
                ChapterComments = comments.Where(c => c.ChapterId != null && string.IsNullOrWhiteSpace(c.ParagraphId)).ToList(),
                InlineComments = inlineComments.Concat(comments.Where(c => !string.IsNullOrWhiteSpace(c.ParagraphId))).ToList()
            };

            // 🚀 BATCH FETCH: User Names
            var allUserIds = reviews.Select(r => r.UserId)
                .Concat(comments.Select(c => c.UserId))
                .Concat(inlineComments.Select(ic => ic.UserId))
                .Distinct()
                .ToList();

            if (allUserIds.Count > 0)
            {
                var userNames = await userProvider.GetDisplayNamesByUserIdsAsync(allUserIds, ct);
                
                foreach (var r in response.Reviews) r.UserName = userNames.GetValueOrDefault(r.UserId, "Bilinmeyen Kullanıcı");
                foreach (var c in response.BookComments) c.UserName = userNames.GetValueOrDefault(c.UserId, "Bilinmeyen Kullanıcı");
                foreach (var c in response.ChapterComments) c.UserName = userNames.GetValueOrDefault(c.UserId, "Bilinmeyen Kullanıcı");
                foreach (var ic in response.InlineComments) ic.UserName = userNames.GetValueOrDefault(ic.UserId, "Bilinmeyen Kullanıcı");
            }

            await Send.ResponseAsync(Result<BookSocialActivityDto>.Success(response), 200, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<BookSocialActivityDto>.Failure($"Veri çekme hatası: {ex.Message}"), 500, ct);
        }
    }
}
