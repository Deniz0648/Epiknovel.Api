using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Identity.Services;

public class UserAccountProvider(
    UserManager<User> userManager,
    IUserProvider userProvider) : IUserAccountProvider
{
    public async Task<bool> IsEmailConfirmedAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        return user?.EmailConfirmed ?? false;
    }

    public async Task<Dictionary<Guid, string>> GetDisplayNamesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        return await userProvider.GetDisplayNamesByUserIdsAsync(userIds, ct);
    }

    public async Task<string?> GetEmailAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        return user?.Email;
    }

    public async Task<(string? Email, string? DisplayName)> GetUserBasicInfoAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return (null, null);

        var displayNames = await userProvider.GetDisplayNamesByUserIdsAsync(new[] { userId }, ct);
        var displayName = displayNames.GetValueOrDefault(userId);

        return (user.Email, displayName);
    }
}
