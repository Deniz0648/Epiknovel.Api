using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Epiknovel.Shared.Core.Events;
using MediatR;

namespace Epiknovel.Shared.Infrastructure.Logging;

/// <summary>
/// Background Log Tüketici (Consumer). 
/// Shared.Infrastructure katmanında olduğu için modüllere (Management vb.) bağlı değildir.
/// Kuyruktaki olayları MediatR aracılığıyla ilgili modüllere (background scope içinde) dağıtır.
/// </summary>
public class BackgroundAuditWorker(
    IBackgroundAuditQueue queue, 
    IServiceScopeFactory scopeFactory,
    ILogger<BackgroundAuditWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Background Audit Worker (Generic) başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 1. Kuyruktan log çek
                var auditEvent = await queue.DequeueAuditEventAsync(stoppingToken);

                // 2. Bir scope oluştur ve MediatR üzerinden dağıt
                using var scope = scopeFactory.CreateScope();
                var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

                // Bu noktada AuditEventHandler (Management modülündeki) tetiklenecek.
                await mediator.Publish(auditEvent, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background Audit Log işlenirken hata oluştu.");
                await Task.Delay(1000, stoppingToken);
            }
        }
    }
}
