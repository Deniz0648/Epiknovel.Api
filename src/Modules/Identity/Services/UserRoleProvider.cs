using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Identity.Services;

public class UserRoleProvider(UserManager<User> userManager) : IUserRoleProvider
{
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
}
