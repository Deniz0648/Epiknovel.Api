using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Library.GetList;

public record Request
{
    public ReadingStatus? Status { get; init; }
    public int Page { get; init; } = 1;
    public int Size { get; init; } = 20;
}

public record LibraryResponse
{
    public Guid Id { get; init; }
    public Guid BookId { get; init; }
    public ReadingStatus Status { get; init; }
    public DateTime AddedAt { get; init; }
    public DateTime? LastReadAt { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<List<LibraryResponse>>>
{
    public override void Configure()
    {
        Get("/social/library");
        Summary(s => {
            s.Summary = "Kendi kütüphanemi listele.";
            s.Description = "Kullanıcının kütüphanesindeki kitapları status bazlı filtreleyerek getirir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<List<LibraryResponse>>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var query = dbContext.LibraryEntries
            .Where(e => e.UserId == userId);

        if (req.Status.HasValue)
            query = query.Where(e => e.Status == req.Status.Value);

        var entries = await query
            .OrderByDescending(e => e.AddedAt)
            .Skip((req.Page - 1) * req.Size)
            .Take(req.Size)
            .Select(e => new LibraryResponse
            {
                Id = e.Id,
                BookId = e.BookId,
                Status = e.Status,
                AddedAt = e.AddedAt,
                LastReadAt = e.LastReadAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<LibraryResponse>>.Success(entries), 200, ct);
    }
}
