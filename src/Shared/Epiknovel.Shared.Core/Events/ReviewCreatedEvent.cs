using MediatR;

namespace Epiknovel.Shared.Core.Events;

public record ReviewCreatedEvent(
    Guid ReviewId,
    Guid BookId,
    Guid UserId,
    double Rating,
    string Content,
    DateTime CreatedAt) : INotification;
