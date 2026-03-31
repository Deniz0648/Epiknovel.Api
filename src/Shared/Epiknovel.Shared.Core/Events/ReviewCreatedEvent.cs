using MediatR;

namespace Epiknovel.Shared.Core.Events;

public record ReviewCreatedEvent(
    Guid ReviewId,
    Guid BookId,
    Guid UserId,
    double Rating,
    double? OldRating, // Güncelleme durumunda eski puanı gönderiyoruz
    string Content,
    DateTime CreatedAt) : INotification;
