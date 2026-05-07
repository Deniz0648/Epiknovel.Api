using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.NotificationPreferences.Get;

public class Endpoint(UsersDbContext dbContext) : EndpointWithoutRequest<Result<NotificationPreference>>
{
    public override void Configure()
    {
        Get("/users/me/notifications");
        Summary(s => {
            s.Summary = "Kullanıcı bildirim tercihlerini getirir.";
            s.Description = "Kullanıcının e-posta ve push bildirim ayarlarını döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<NotificationPreference>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var pref = await dbContext.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (pref == null)
        {
            // Eğer yoksa varsayılanlarla bir tane oluştur (Idempotent)
            pref = new NotificationPreference { UserId = userId };
            dbContext.NotificationPreferences.Add(pref);
            await dbContext.SaveChangesAsync(ct);
        }

        await Send.ResponseAsync(Result<NotificationPreference>.Success(pref), 200, ct);
    }
}
