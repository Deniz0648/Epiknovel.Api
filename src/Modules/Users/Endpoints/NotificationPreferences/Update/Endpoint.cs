using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.NotificationPreferences.Update;

public record Request
{
    public bool? EmailOnNewChapter { get; init; }
    public bool? EmailOnNewReview { get; init; }
    public bool? EmailOnNewComment { get; init; }
    public bool? PushOnNewChapter { get; init; }
    public bool? PushOnNewReview { get; init; }
    public bool? PushOnNewComment { get; init; }
    public bool? EmailMarketing { get; init; }
}

public class Endpoint(UsersDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/users/me/notifications");
        Summary(s => {
            s.Summary = "Kullanıcı bildirim tercihlerini günceller.";
            s.Description = "Kullanıcının e-posta ve push bildirim ayarlarını günceller.";
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

        var pref = await dbContext.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (pref == null)
        {
            pref = new NotificationPreference { UserId = userId };
            dbContext.NotificationPreferences.Add(pref);
        }

        if (req.EmailOnNewChapter.HasValue) pref.EmailOnNewChapter = req.EmailOnNewChapter.Value;
        if (req.EmailOnNewReview.HasValue) pref.EmailOnNewReview = req.EmailOnNewReview.Value;
        if (req.EmailOnNewComment.HasValue) pref.EmailOnNewComment = req.EmailOnNewComment.Value;
        if (req.PushOnNewChapter.HasValue) pref.PushOnNewChapter = req.PushOnNewChapter.Value;
        if (req.PushOnNewReview.HasValue) pref.PushOnNewReview = req.PushOnNewReview.Value;
        if (req.PushOnNewComment.HasValue) pref.PushOnNewComment = req.PushOnNewComment.Value;
        if (req.EmailMarketing.HasValue) pref.EmailMarketing = req.EmailMarketing.Value;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Bildirim tercihleriniz başarıyla güncellendi."), 200, ct);
    }
}
