using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace Epiknovel.Modules.Identity.Services;

public sealed class AuthStateService(
    IdentityDbContext dbContext,
    IDistributedCache cache,
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
            var revocationTasks = activeJtis
                .Select(jti => cache.SetStringAsync(
                    $"revoked_token:{jti}", 
                    "1", 
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = AccessTokenRevocationTtl }))
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
