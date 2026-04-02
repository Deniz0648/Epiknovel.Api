using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Infrastructure.Features.Notifications.Commands.MarkAsRead;

public record MarkNotificationAsReadCommand(
    Guid UserId,
    Guid NotificationId
) : IRequest<Result<string>>;
