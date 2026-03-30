using System.Threading.Channels;
using Epiknovel.Shared.Core.Events;

namespace Epiknovel.Shared.Infrastructure.Logging;

/// <summary>
/// Audit loglarını ana iş parçacığını (request thread) bloklamadan sıraya alan kanal.
/// Performans ve ölçeklenebilirlik için 'Fast-Fail' yerine 'Async-Log' yaklaşımını sağlar.
/// </summary>
public interface IBackgroundAuditQueue
{
    ValueTask QueueAuditEventAsync(AuditEvent auditEvent);
    ValueTask<AuditEvent> DequeueAuditEventAsync(CancellationToken ct);
}

public class BackgroundAuditQueue : IBackgroundAuditQueue
{
    private readonly Channel<AuditEvent> _queue;

    public BackgroundAuditQueue()
    {
        // Kapasiteli kanal (Bounded Channel): Çok yüksek yük altında bellek şişmesini engeller (Backpressure)
        var options = new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.DropOldest // Kuyruk dolarsa en eski logdan feragat et (Gerçek zamanlılık öncelikli)
        };
        _queue = Channel.CreateBounded<AuditEvent>(options);
    }

    public async ValueTask QueueAuditEventAsync(AuditEvent auditEvent)
    {
        await _queue.Writer.WriteAsync(auditEvent);
    }

    public async ValueTask<AuditEvent> DequeueAuditEventAsync(CancellationToken ct)
    {
        return await _queue.Reader.ReadAsync(ct);
    }
}
