using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Infrastructure.Features.Notifications.Queries.GetNotificationList;

public class GetNotificationListHandler(InfrastructureDbContext dbContext) : IRequestHandler<GetNotificationListQuery, Result<List<NotificationResponse>>>
{
    public async Task<Result<List<NotificationResponse>>> Handle(GetNotificationListQuery request, CancellationToken ct)
    {
        var notifications = await dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == request.UserId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(request.Limit)
            .Select(n => new NotificationResponse
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Message,
                ActionUrl = n.ActionUrl,
                Type = n.Type,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(ct);

        return Result<List<NotificationResponse>>.Success(notifications);
    }
}
