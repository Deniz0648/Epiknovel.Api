using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Identity.Services;

public class UserRoleProvider(UserManager<User> userManager) : IUserRoleProvider, IUserAccountProvider
{
    public async Task<bool> IsEmailConfirmedAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        return user != null && user.EmailConfirmed;
    }

    public async Task AddRoleAsync(Guid userId, string roleName, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user != null)
        {
            await userManager.AddToRoleAsync(user, roleName);
        }
    }

    public async Task RemoveRoleAsync(Guid userId, string roleName, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user != null)
        {
            await userManager.RemoveFromRoleAsync(user, roleName);
        }
    }

    public async Task<IList<string>> GetRolesAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return new List<string>();
        return await userManager.GetRolesAsync(user);
    }

    public async Task<Dictionary<Guid, string>> GetDisplayNamesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        if (userIds == null || !userIds.Any()) return new Dictionary<Guid, string>();

        var distinctIds = userIds.Distinct().ToList();
        
        return await userManager.Users
            .Where(u => distinctIds.Contains(u.Id))
            .AsNoTracking()
            .Select(u => new { u.Id, u.DisplayName })
            .ToDictionaryAsync(x => x.Id, x => x.DisplayName ?? "İsimsiz", ct);
    }
}
