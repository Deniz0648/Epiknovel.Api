using MediatR;

namespace Epiknovel.Shared.Core.Events;

public record UserRegisteredEvent(Guid UserId, string Email, string DisplayName) : INotification;
