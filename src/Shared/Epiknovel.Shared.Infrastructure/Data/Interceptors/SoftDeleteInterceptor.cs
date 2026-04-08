using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Epiknovel.Shared.Infrastructure.Data.Interceptors;

public class SoftDeleteInterceptor(IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken ct = default)
    {
        if (eventData.Context == null) return base.SavingChangesAsync(eventData, result, ct);

        foreach (var entry in eventData.Context.ChangeTracker.Entries<ISoftDelete>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAt = DateTime.UtcNow;
                
                var userIdStr = httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (Guid.TryParse(userIdStr, out var userId))
                {
                    entry.Entity.DeletedByUserId = userId;
                }
            }
        }

        return base.SavingChangesAsync(eventData, result, ct);
    }
}
