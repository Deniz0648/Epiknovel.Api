using MediatR;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Events;

namespace Epiknovel.Modules.Management.Events;

public class AuditEventHandler(ManagementDbContext dbContext) : INotificationHandler<AuditEvent>
{
    public async Task Handle(AuditEvent notification, CancellationToken ct)
    {
        var log = new AuditLog
        {
            UserId = notification.UserId,
            Module = notification.Module,
            Action = notification.Action,
            EntityName = notification.EntityName,
            EntityId = notification.EntityId,
            OldValues = notification.OldValues,
            NewValues = notification.NewValues,
            IpAddress = notification.IpAddress,
            UserAgent = notification.UserAgent,
            Endpoint = notification.Endpoint,
            Method = notification.Method,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.AuditLogs.Add(log);
        await dbContext.SaveChangesAsync(ct);
    }
}
