using MediatR;

namespace Epiknovel.Shared.Core.Events;

public record AuditEvent(
    Guid UserId,
    string Module,
    string Action,
    string EntityName,
    string EntityId,
    string IpAddress,
    string UserAgent,
    string Endpoint,
    string Method,
    string? OldValues = null,
    string? NewValues = null
) : INotification;
