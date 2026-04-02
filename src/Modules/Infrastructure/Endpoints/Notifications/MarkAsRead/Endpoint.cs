using FastEndpoints;
using Epiknovel.Modules.Infrastructure.Features.Notifications.Commands.MarkAsRead;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Notifications.MarkAsRead;

public record Request
{
    public Guid NotificationId { get; init; }
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/notifications/{NotificationId}/read"); // Removed /infrastructure prefix to match frontend
        Summary(s => {
            s.Summary = "Bildirimi okundu yap.";
            s.Description = "Belirtilen bildirim ID'sine ait bildirimi okundu olarak işaretler. MediatR standardı uygulanmıştır.";
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

        var result = await mediator.Send(new MarkNotificationAsReadCommand(userId, req.NotificationId), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(result, 404, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
