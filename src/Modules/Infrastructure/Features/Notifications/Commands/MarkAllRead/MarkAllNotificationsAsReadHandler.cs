using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Infrastructure.Features.Notifications.Commands.MarkAllRead;

public class MarkAllNotificationsAsReadHandler(InfrastructureDbContext dbContext) : IRequestHandler<MarkAllNotificationsAsReadCommand, Result<string>>
{
    public async Task<Result<string>> Handle(MarkAllNotificationsAsReadCommand request, CancellationToken ct)
    {
        // 🚀 BULK UPDATE (PERFORMANS: Tek sorguda tümünü günceller)
        await dbContext.Notifications
            .Where(n => n.UserId == request.UserId && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.IsRead, true)
                .SetProperty(p => p.ReadAt, DateTime.UtcNow), ct);

        return Result<string>.Success("Tüm bildirimler okundu olarak işaretlendi.");
    }
}
