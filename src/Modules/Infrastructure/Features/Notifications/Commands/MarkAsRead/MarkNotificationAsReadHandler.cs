using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Infrastructure.Features.Notifications.Commands.MarkAsRead;

public class MarkNotificationAsReadHandler(InfrastructureDbContext dbContext) : IRequestHandler<MarkNotificationAsReadCommand, Result<string>>
{
    public async Task<Result<string>> Handle(MarkNotificationAsReadCommand request, CancellationToken ct)
    {
        var notification = await dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == request.NotificationId && n.UserId == request.UserId, ct);

        if (notification == null)
        {
            return Result<string>.Failure("Bildirim bulunamadı.");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(ct);
        }

        return Result<string>.Success("Bildirim okundu olarak işaretlendi.");
    }
}
