using System.Security.Claims;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Identity.Services;

public class ManagementUserProvider(
    UserManager<User> userManager,
    IHttpContextAccessor httpContextAccessor) : IManagementUserProvider
{
    private static readonly Dictionary<string, int> RoleRanks = new()
    {
        { RoleNames.SuperAdmin, 100 },
        { RoleNames.Admin, 80 },
        { RoleNames.Mod, 60 },
        { RoleNames.Author, 40 },
        { RoleNames.User, 20 }
    };

    private async Task<bool> ValidateHierarchyAsync(User targetUser)
    {
        var context = httpContextAccessor.HttpContext;
        if (context == null || context.User.Identity?.IsAuthenticated != true)
            return false;

        var actorRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var actorRank = actorRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0));

        var targetRoles = await userManager.GetRolesAsync(targetUser);
        var targetRank = targetRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0));

        // An actor must strictly outrank the target
        return actorRank > targetRank;
    }

    public async Task<bool> BanUserAsync(Guid userId, string reason, CancellationToken ct = default)
    {
        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        if (!await ValidateHierarchyAsync(targetUser))
            return false;

        targetUser.LockoutEnd = DateTimeOffset.MaxValue; // Permanent ban basically, or a long date
        
        // Storing reason in a custom claim or mapping to the AuditLog via interceptor.
        // For now, Identity's Lockout works well. 
        var result = await userManager.UpdateAsync(targetUser);
        return result.Succeeded;
    }

    public async Task<bool> UnbanUserAsync(Guid userId, CancellationToken ct = default)
    {
        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        if (!await ValidateHierarchyAsync(targetUser))
            return false;

        targetUser.LockoutEnd = null;
        var result = await userManager.UpdateAsync(targetUser);
        return result.Succeeded;
    }

    public async Task<bool> UpdateUserRoleAsync(Guid userId, string role, CancellationToken ct = default)
    {
        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        // Verify the actor outranks both the TARGET's current highest role, and the ROLE being assigned
        var context = httpContextAccessor.HttpContext;
        if (context == null || context.User.Identity?.IsAuthenticated != true)
            return false;
            
        var actorRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var actorRank = actorRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0));
        
        var assignmentRank = RoleRanks.GetValueOrDefault(role, 0);
        if (actorRank <= assignmentRank)
            return false; // Can't assign a role equal or higher than oneself

        if (!await ValidateHierarchyAsync(targetUser))
            return false; // Can't modify someone equal or higher than oneself

        // Strip existing operational roles, except maybe User
        var rolesToRemove = await userManager.GetRolesAsync(targetUser);
        if (rolesToRemove.Any())
            await userManager.RemoveFromRolesAsync(targetUser, rolesToRemove);

        // Add the new role, plus User core role
        await userManager.AddToRoleAsync(targetUser, RoleNames.User);
        if (role != RoleNames.User)
        {
            await userManager.AddToRoleAsync(targetUser, role);
        }

        return true;
    }

    public async Task<bool> TriggerPasswordResetAsync(Guid userId, CancellationToken ct = default)
    {
        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        if (!await ValidateHierarchyAsync(targetUser))
            return false;

        // Generating a reset token and sending it (Placeholder for email integration)
        var token = await userManager.GeneratePasswordResetTokenAsync(targetUser);
        // TODO: Fire a domain event to send the email via the Notification service.
        return true;
    }

    public async Task<List<UserManagementDto>> GetPaginatedUsersAsync(DateTime? cursor, int take, string? searchString, CancellationToken ct = default)
    {
        var query = userManager.Users.AsNoTracking();

        if (cursor.HasValue)
        {
            query = query.Where(u => u.CreatedAt < cursor.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchString))
        {
            var search = searchString.ToLower();
            query = query.Where(u => 
                (u.Email != null && u.Email.ToLower().Contains(search)) || 
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(search)) ||
                (u.UserName != null && u.UserName.ToLower().Contains(search)));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Take(take)
            .Select(u => new UserManagementDto
            {
                Id = u.Id,
                Email = u.Email ?? string.Empty,
                DisplayName = u.DisplayName ?? string.Empty,
                CreatedAt = u.CreatedAt,
                IsBanned = u.LockoutEnd.HasValue && u.LockoutEnd.Value > DateTimeOffset.UtcNow
            })
            .ToListAsync(ct);

        // Map roles efficiently in a batch since EF Core can't easily query joined IdentityRoles within async Select mapping optimally.
        foreach (var userDto in users)
        {
            var identUser = new User { Id = userDto.Id };
            var roles = await userManager.GetRolesAsync(identUser);
            userDto.Roles = roles.ToList();
        }

        return users;
    }
}
