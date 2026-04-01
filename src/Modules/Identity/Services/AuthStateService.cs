using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Identity.Services;

public sealed class AuthStateService(
    IdentityDbContext dbContext,
    StackExchange.Redis.IConnectionMultiplexer redis,
    IHubContext<GlobalNotificationHub> hubContext) : IAuthStateService
{
    private static readonly TimeSpan AccessTokenRevocationTtl = TimeSpan.FromMinutes(70);

    public async Task HandlePermissionsChangedAsync(Guid userId, string reason, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var activeJtis = await dbContext.UserSessions
            .AsNoTracking()
            .Where(session => session.UserId == userId && !session.IsRevoked && session.ExpiryDate > now)
            .Select(session => session.AccessTokenJti)
            .Where(jti => !string.IsNullOrWhiteSpace(jti))
            .Distinct()
            .ToListAsync(ct);

        if (activeJtis.Count > 0)
        {
            var redisDb = redis.GetDatabase();
            var revocationTasks = activeJtis
                .Select(jti => redisDb.StringSetAsync($"revoked_token:{jti}", "1", AccessTokenRevocationTtl))
                .ToArray();

            await Task.WhenAll(revocationTasks);
        }

        await hubContext.Clients.User(userId.ToString()).SendAsync(
            "AuthStateChanged",
            new
            {
                reason,
                refreshSession = true,
                refreshProfile = true,
                occurredAt = now
            },
            ct);
    }
}
