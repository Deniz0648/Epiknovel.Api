using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Social.Endpoints.Reviews.GetList;

public record Request
{
    public Guid BookId { get; init; }
    public int Page { get; init; } = 1;
    public int Size { get; init; } = 10;
}

public record ReviewResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string Content { get; init; } = string.Empty;
    public double Rating { get; init; }
    public int LikeCount { get; init; }
    public bool IsEditorChoice { get; init; }
    public DateTime CreatedAt { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<List<ReviewResponse>>>
{
    public override void Configure()
    {
        Get("/social/reviews");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Kitap incelemelerini listele.";
            s.Description = "Belirli bir kitaba yapılmış tüm incelemeleri (puan ve yorum) listeler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var reviews = await dbContext.Reviews
            .Where(r => r.BookId == req.BookId && !r.IsDeleted)
            .OrderByDescending(r => r.IsEditorChoice)
            .ThenByDescending(r => r.CreatedAt)
            .Skip((req.Page - 1) * req.Size)
            .Take(req.Size)
            .Select(r => new ReviewResponse
            {
                Id = r.Id,
                UserId = r.UserId,
                Content = r.Content,
                Rating = r.Rating,
                LikeCount = r.LikeCount,
                IsEditorChoice = r.IsEditorChoice,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<ReviewResponse>>.Success(reviews), 200, ct);
    }
}
