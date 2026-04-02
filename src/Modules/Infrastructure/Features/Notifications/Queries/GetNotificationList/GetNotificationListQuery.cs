using Epiknovel.Shared.Core.Models;
using Epiknovel.Modules.Infrastructure.Domain;
using MediatR;

namespace Epiknovel.Modules.Infrastructure.Features.Notifications.Queries.GetNotificationList;

public record GetNotificationListQuery(
    Guid UserId,
    int Limit = 50
) : IRequest<Result<List<NotificationResponse>>>;

public record NotificationResponse
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string? ActionUrl { get; init; }
    public NotificationType Type { get; init; }
    public bool IsRead { get; init; }
    public DateTime CreatedAt { get; init; }
}
