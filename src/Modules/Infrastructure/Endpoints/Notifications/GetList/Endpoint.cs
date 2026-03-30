using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Modules.Infrastructure.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Notifications.GetList;

public record Response
{
    public IEnumerable<NotificationDto> Notifications { get; init; } = [];
}

public record NotificationDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string? ActionUrl { get; init; }
    public NotificationType Type { get; init; }
    public bool IsRead { get; init; }
    public DateTime CreatedAt { get; init; }
}

public class Endpoint(InfrastructureDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/infrastructure/notifications");
        Summary(s => {
            s.Summary = "Kullanıcı bildirimlerini listele.";
            s.Description = "Giriş yapmış kullanıcının bildirimlerini tarihe göre azalan sırada sayfalamasız olarak (en fazla 50 adet) getirir.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var notifications = await dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto
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

        await Send.ResponseAsync(Result<Response>.Success(new Response { Notifications = notifications }), 200, ct);
    }
}
