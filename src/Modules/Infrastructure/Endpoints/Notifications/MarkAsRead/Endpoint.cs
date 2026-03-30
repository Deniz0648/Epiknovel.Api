using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Notifications.MarkAsRead;

public record Request
{
    public Guid NotificationId { get; init; }
}

public class Endpoint(InfrastructureDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/infrastructure/notifications/{NotificationId}/read");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var notification = await dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == req.NotificationId && n.UserId == userId, ct);

        if (notification == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Bildirim bulunamadı."), 404, ct);
            return;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);
        }

        await Send.ResponseAsync(Result<string>.Success("Bildirim okundu olarak işaretlendi."), 200, ct);
    }
}
