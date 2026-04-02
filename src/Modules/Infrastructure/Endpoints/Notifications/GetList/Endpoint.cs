using FastEndpoints;
using Epiknovel.Modules.Infrastructure.Features.Notifications.Queries.GetNotificationList;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Notifications.GetList;

public record Response(List<NotificationResponse> Notifications);

public class Endpoint(IMediator mediator) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/notifications"); // Frontend expects /notifications
        Summary(s => {
            s.Summary = "Kullanıcı bildirimlerini listele.";
            s.Description = "Giriş yapmış kullanıcının bildirimlerini getirir. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new GetNotificationListQuery(userId), ct);
        
        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response(result.Data!)), 200, ct);
    }
}
