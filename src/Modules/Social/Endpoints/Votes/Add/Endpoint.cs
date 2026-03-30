using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Votes.Add;

public record Request
{
    public Guid BookId { get; init; }
    public int Value { get; init; } // Örn: 1 (Tek oy) veya VIP için daha fazla
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/votes");
        Summary(s => {
            s.Summary = "Kitaba oy ver (Sıralama için).";
            s.Description = "Haftalık/Aylık sıralamalar için kitaba oy verir (Güç taşı vb. mantığı).";
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

        // Günlük oy sınırı vb. kontroller eklenebilir
        var vote = new BookVote
        {
            BookId = req.BookId,
            UserId = userId,
            Value = Math.Max(1, req.Value),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.BookVotes.Add(vote);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Oyunuz başarıyla kaydedildi."), 200, ct);
    }
}
