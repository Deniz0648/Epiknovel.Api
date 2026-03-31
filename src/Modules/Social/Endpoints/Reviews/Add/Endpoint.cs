using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using MediatR;
using Epiknovel.Shared.Core.Events;
using Microsoft.AspNetCore.Builder;

namespace Epiknovel.Modules.Social.Endpoints.Reviews.Add;

public record Request
{
    public Guid BookId { get; init; }
    public string Content { get; init; } = string.Empty;
    public double Rating { get; init; } // 1-5
}

public class Endpoint(SocialDbContext dbContext, IMediator mediator, Epiknovel.Shared.Core.Interfaces.Books.IBookProvider bookProvider) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/reviews");
        Options(x => x.RequireRateLimiting("SocialPolicy"));
        Summary(s => {
            s.Summary = "Kitap incelemesi ekle";
            s.Description = "Kullanıcıların bir kitap hakkında puan verip detaylı inceleme yazmasını sağlar (Dakikada 15 işlem limiti).";
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

        // Kitap silinmiş mi? (Soft Deleted kitaba inceleme yazılamaz)
        var bookActive = await bookProvider.IsBookActiveAsync(req.BookId, ct);
        if (!bookActive)
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Kitap bulunamadı veya silinmiş."), 404, ct);
            return;
        }

        // Bir kullanıcı her kitaba sadece 1 inceleme yapabilir. Eğer varsa güncelle.
        var review = await dbContext.Reviews
            .FirstOrDefaultAsync(r => r.BookId == req.BookId && r.UserId == userId, ct);

        double? oldRating = null;
        bool isUpdate = review != null;
        if (!isUpdate)
        {
            review = new Review
            {
                UserId = userId,
                BookId = req.BookId,
            };
            dbContext.Reviews.Add(review);
        }
        else 
        {
            oldRating = review!.Rating;
        }

        // 4. İncelemeyi Kaydet (XSS Koruması)
        var sanitizer = new Ganss.Xss.HtmlSanitizer();
        review.Content = sanitizer.Sanitize(req.Content);
        review.Rating = Math.Clamp(req.Rating, 1, 5);
        review.CreatedAt = DateTime.UtcNow; 

        await dbContext.SaveChangesAsync(ct);

        // Domain Event'i yayınla (Books modülünün ortalama puanı güncellemesi için)
        // Tabakaları ayırmak için her durumda 'ReviewCreatedEvent' (veya isterseniz 'ReviewUpdatedEvent') fırlatıyoruz.
        // Books modülündeki handler her iki durumu da puanı yeniden hesaplayarak yönetebilir.
        await mediator.Publish(new ReviewCreatedEvent(
            review.Id,
            review.BookId,
            review.UserId,
            review.Rating,
            oldRating, // Eski puanı (varsa) gönder
            review.Content,
            review.CreatedAt), ct);

        await Send.ResponseAsync(Result<Guid>.Success(review.Id), 200, ct);
    }
}
