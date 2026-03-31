using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Services;

public class UserProvider(UsersDbContext dbContext) : IUserProvider
{
    public async Task<Guid?> GetUserIdBySlugAsync(string slug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        var normalizedSlug = Epiknovel.Shared.Core.Common.SlugHelper.ToSlug(slug);
        if (string.IsNullOrWhiteSpace(normalizedSlug))
        {
            return null;
        }

        return await dbContext.UserProfiles
            .AsNoTracking()
            .Where(p => p.Slug == normalizedSlug)
            .Select(p => (Guid?)p.UserId)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<Dictionary<Guid, string>> GetSlugsByUserIdsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var ids = userIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return await dbContext.UserProfiles
            .AsNoTracking()
            .Where(p => ids.Contains(p.UserId))
            .Select(p => new { p.UserId, p.Slug })
            .ToDictionaryAsync(x => x.UserId, x => x.Slug, ct);
    }

    public async Task<bool> IsAuthorAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.UserProfiles
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.IsAuthor)
            .FirstOrDefaultAsync(ct);
    }

    public async Task SetAuthorStatusAsync(Guid userId, bool isAuthor, CancellationToken ct = default)
    {
        var profile = await dbContext.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile != null)
        {
            profile.IsAuthor = isAuthor;
            await dbContext.SaveChangesAsync(ct);
        }
    }

    public async Task<bool> IsPaidAuthorAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.UserProfiles
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.IsPaidAuthor)
            .FirstOrDefaultAsync(ct);
    }

    public async Task SetPaidAuthorStatusAsync(Guid userId, bool isPaidAuthor, string? iban, CancellationToken ct = default)
    {
        var profile = await dbContext.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile != null)
        {
            profile.IsPaidAuthor = isPaidAuthor;
            profile.VerifiedIban = iban;
            await dbContext.SaveChangesAsync(ct);
        }
    }
}
