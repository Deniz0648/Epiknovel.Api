using FastEndpoints;
using Epiknovel.Modules.Infrastructure.Features.Notifications.Commands.MarkAllRead;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Notifications.MarkAllAsRead;

public class Endpoint(IMediator mediator) : EndpointWithoutRequest<Result<string>>
{
    public override void Configure()
    {
        Post("/notifications/read-all");
        Summary(s => {
            s.Summary = "Tüm bildirimleri okundu yap.";
            s.Description = "Kullanıcıya ait okunmamış tüm bildirimleri tek seferde okundu olarak işaretler.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new MarkAllNotificationsAsReadCommand(userId), ct);
        await Send.ResponseAsync(result, 200, ct);
    }
}
