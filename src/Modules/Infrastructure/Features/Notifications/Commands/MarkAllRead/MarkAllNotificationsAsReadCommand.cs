using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Infrastructure.Features.Notifications.Commands.MarkAllRead;

public record MarkAllNotificationsAsReadCommand(Guid UserId) : IRequest<Result<string>>;
