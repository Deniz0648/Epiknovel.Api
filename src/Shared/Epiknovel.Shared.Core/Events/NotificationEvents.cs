using MediatR;

namespace Epiknovel.Shared.Core.Events;

// Bildirim tetikleyecek olaylar (Decoupled Notification Events)

public record OrderPaidEvent(Guid UserId, Guid OrderId, decimal Amount, int CoinAmount) : INotification;

public record InvoiceUploadedEvent(Guid UserId, Guid OrderId, string InvoiceUrl) : INotification;

public record AuthorApplicationReviewedEvent(Guid UserId, bool IsApproved, string? Note) : INotification;

public record PaidAuthorApplicationReviewedEvent(Guid UserId, bool IsApproved, string? Note) : INotification;

public record UserRoleUpdatedEvent(Guid UserId, string NewRole, string Description) : INotification;
