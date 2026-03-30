using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using MediatR;
using Epiknovel.Shared.Core.Events;

namespace Epiknovel.Modules.Social.Endpoints.Reviews.Add;

public record Request
{
    public Guid BookId { get; init; }
    public string Content { get; init; } = string.Empty;
    public double Rating { get; init; } // 1-5
}

public class Endpoint(SocialDbContext dbContext, IMediator mediator) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/reviews");
        Summary(s => {
            s.Summary = "Kitap incelemesi ekle";
            s.Description = "Kullanıcıların bir kitap hakkında puan verip detaylı inceleme yazmasını sağlar.";
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

        // Bir kullanıcı her kitaba sadece 1 inceleme yapabilir? (Genel kural)
        var existing = await dbContext.Reviews
            .AnyAsync(r => r.BookId == req.BookId && r.UserId == userId, ct);

        if (existing)
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Bu kitaba zaten bir inceleme yapmışsınız."), 400, ct);
            return;
        }

        var review = new Review
        {
            UserId = userId,
            BookId = req.BookId,
            Content = req.Content,
            Rating = Math.Clamp(req.Rating, 1, 5),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Reviews.Add(review);
        await dbContext.SaveChangesAsync(ct);

        // Domain Event'i yayınla (Books modülünün ortalama puanı güncellemesi için)
        await mediator.Publish(new ReviewCreatedEvent(
            review.Id,
            review.BookId,
            review.UserId,
            review.Rating,
            review.Content,
            review.CreatedAt), ct);

        await Send.ResponseAsync(Result<Guid>.Success(review.Id), 200, ct);
    }
}
