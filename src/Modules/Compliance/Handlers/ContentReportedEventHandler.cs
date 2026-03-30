using System.Threading;
using System.Threading.Tasks;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Modules.Compliance.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace Epiknovel.Modules.Compliance.Handlers;

public class ContentReportedEventHandler(ComplianceDbContext dbContext) : INotificationHandler<ContentReportedEvent>
{
    public async Task Handle(ContentReportedEvent notification, CancellationToken cancellationToken)
    {
        // Aynı içerik için bekleyen bir bilet var mı kontrol et (Concurrency ve Idempotency)
        var existingTicket = await dbContext.ModerationTickets
            .FirstOrDefaultAsync(t => t.ContentId == notification.ContentId && t.Status == TicketStatus.Pending, cancellationToken);

        if (existingTicket != null)
        {
            // Kullanıcı bu içeriği önceden şikayet etmiş mi?
            if (!existingTicket.ReporterIds.Contains(notification.ReporterId))
            {
                existingTicket.ReporterIds.Add(notification.ReporterId);
                existingTicket.ReportCount++;
                existingTicket.UpdatedAt = System.DateTime.UtcNow;
                
                // Birden çok şikayet açıklamasını concat et
                if (!string.IsNullOrWhiteSpace(notification.Description))
                {
                    existingTicket.InitialDescription += $" | {notification.Description}";
                }
            }
        }
        else
        {
            var ticket = new ModerationTicket
            {
                ContentId = notification.ContentId,
                ContentType = notification.ContentType,
                TopReason = notification.Reason,
                InitialDescription = notification.Description,
                ReportCount = 1,
                ReporterIds = new System.Collections.Generic.List<System.Guid> { notification.ReporterId },
                Status = TicketStatus.Pending
            };
            
            dbContext.ModerationTickets.Add(ticket);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
