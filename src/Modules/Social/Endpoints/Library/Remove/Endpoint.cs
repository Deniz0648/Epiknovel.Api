using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Library.Remove;

public record Request
{
    public Guid Id { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Delete("/social/library/{id}");
        Summary(s => {
            s.Summary = "Kitabı kütüphaneden çıkar.";
            s.Description = "Seçilen kitabı kullanıcının kütüphanesinden kalıcı olarak kaldırır.";
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

        var entry = await dbContext.LibraryEntries
            .FirstOrDefaultAsync(e => e.Id == req.Id && e.UserId == userId, ct);

        if (entry == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Kütüphane girdisi bulunamadı."), 404, ct);
            return;
        }

        dbContext.LibraryEntries.Remove(entry);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Kitap kütüphanenizden çıkarıldı."), 200, ct);
    }
}
