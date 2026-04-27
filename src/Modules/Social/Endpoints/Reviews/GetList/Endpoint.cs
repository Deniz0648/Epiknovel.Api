using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces.Books;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Endpoints.Reviews.GetList;

public record Request
{
    public Guid? BookId { get; init; }
    public bool? IsEditorChoice { get; init; }
    public int Page { get; init; } = 1;
    public int Size { get; init; } = 10;
}

public record ReviewResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string UserName { get; set; } = string.Empty;
    public string? UserAvatar { get; set; }
    public string Content { get; init; } = string.Empty;
    public double Rating { get; init; }
    public int LikeCount { get; init; }
    public bool IsEditorChoice { get; init; }
    public Guid BookId { get; init; }
    public string BookTitle { get; set; } = string.Empty;
    public string BookSlug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}

public class Endpoint(SocialDbContext dbContext, IBookProvider bookProvider, IUserProvider userProvider) : Endpoint<Request, Result<List<ReviewResponse>>>
{
    public override void Configure()
    {
        Get("/social/reviews");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Kitap incelemelerini listele.";
            s.Description = "Belirli bir kitaba yapılmış veya sistemdeki en son incelemeleri (puan ve yorum) listeler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. İncelemeleri çek
        var reviewQuery = dbContext.Reviews.AsNoTracking().Where(r => !r.IsDeleted && !r.IsHidden);
        if (req.BookId.HasValue) reviewQuery = reviewQuery.Where(r => r.BookId == req.BookId.Value);
        if (req.IsEditorChoice.HasValue) reviewQuery = reviewQuery.Where(r => r.IsEditorChoice == req.IsEditorChoice.Value);

        var reviews = await reviewQuery
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReviewResponse
            {
                Id = r.Id,
                UserId = r.UserId,
                Content = r.Content,
                Rating = r.Rating,
                LikeCount = r.LikeCount,
                IsEditorChoice = r.IsEditorChoice,
                BookId = r.BookId,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync(ct);

        // 2. Eğer EditorChoice isteniyorsa, Yorumlar tablosundaki öne çıkarılanları da ekle
        if (req.IsEditorChoice == true)
        {
            var featuredComments = await dbContext.Comments
                .AsNoTracking()
                .Where(c => !c.IsDeleted && !c.IsHidden && c.IsEditorChoice)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new ReviewResponse
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    Content = c.Content,
                    Rating = 5.0, // Yorumlar için varsayılan tam puan (Editör seçimi olduğu için)
                    LikeCount = c.LikeCount,
                    IsEditorChoice = true,
                    BookId = c.BookId ?? Guid.Empty,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync(ct);

            reviews.AddRange(featuredComments);
        }

        // 3. Tarihe göre sırala ve sayfalama yap
        var finalResult = reviews
            .OrderByDescending(r => r.CreatedAt)
            .Skip((req.Page - 1) * req.Size)
            .Take(req.Size)
            .ToList();

        if (finalResult.Count > 0)
        {
            var bookIds = finalResult.Where(r => r.BookId != Guid.Empty).Select(r => r.BookId).Distinct().ToList();
            var userIds = finalResult.Select(r => r.UserId).Distinct().ToList();

            var bookDetails = await bookProvider.GetBookBasicsByIdsAsync(bookIds, ct);
            var userNames = await userProvider.GetDisplayNamesByUserIdsAsync(userIds, ct);
            var userAvatars = await userProvider.GetAvatarsByUserIdsAsync(userIds, ct);

            foreach (var item in finalResult)
            {
                if (bookDetails.TryGetValue(item.BookId, out var bookInfo))
                {
                    item.BookTitle = bookInfo.Title;
                    item.BookSlug = bookInfo.Slug;
                }
                item.UserName = userNames.GetValueOrDefault(item.UserId, "Bilinmeyen Kullanıcı");
                item.UserAvatar = userAvatars.GetValueOrDefault(item.UserId);
            }
        }

        await Send.ResponseAsync(Result<List<ReviewResponse>>.Success(finalResult), 200, ct);
    }
}
