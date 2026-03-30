using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Library.Add;

public record Request
{
    public Guid BookId { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/library");
        Summary(s => {
            s.Summary = "Kitabı kütüphaneye ekle.";
            s.Description = "Seçilen kitabı kullanıcının okuma listesine/kütüphanesine ekler.";
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

        var existing = await dbContext.LibraryEntries
            .AnyAsync(e => e.BookId == req.BookId && e.UserId == userId, ct);

        if (existing)
        {
            await Send.ResponseAsync(Result<string>.Failure("Bu kitap zaten kütüphanenizde."), 400, ct);
            return;
        }

        var entry = new LibraryEntry
        {
            BookId = req.BookId,
            UserId = userId,
            Status = ReadingStatus.Reading, // Varsayılan olarak okuyor olarak ekle
            AddedAt = DateTime.UtcNow
        };

        dbContext.LibraryEntries.Add(entry);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Kitap kütüphanenize eklendi."), 200, ct);
    }
}
