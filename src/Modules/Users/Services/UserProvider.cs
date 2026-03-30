using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Services;

public class UserProvider(UsersDbContext dbContext) : IUserProvider
{
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
