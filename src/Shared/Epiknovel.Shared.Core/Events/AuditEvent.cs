using Epiknovel.Shared.Core.Domain;
using MediatR;

namespace Epiknovel.Shared.Core.Events;

public record AuditEvent(
    Guid? UserId,
    string Module,
    string Action,
    string EntityName,
    string? PrimaryKeys,
    EntityState State,
    string? OldValues = null,
    string? NewValues = null,
    string? ChangedColumns = null,
    string? IpAddress = null,
    string? UserAgent = null,
    string? Endpoint = null,
    string? Method = null,
    string? TraceId = null
) : INotification;
