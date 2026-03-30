using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Library.UpdateStatus;

public record Request
{
    public Guid Id { get; init; }
    public ReadingStatus Status { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Patch("/social/library");
        Summary(s => {
            s.Summary = "Kütüphane girdisi durumunu güncelle.";
            s.Description = "Kitabın durumunu 'PlanToRead', 'Reading', 'Completed', 'Dropped' olarak günceller.";
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

        entry.Status = req.Status;
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Okuma durumu güncellendi."), 200, ct);
    }
}
