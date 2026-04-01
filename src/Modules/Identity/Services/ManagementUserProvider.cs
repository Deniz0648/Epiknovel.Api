using System.Security.Claims;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Interfaces.Management;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Identity.Services;

public class ManagementUserProvider(
    UserManager<User> userManager,
    IdentityDbContext identityDbContext,
    IHttpContextAccessor httpContextAccessor,
    IUserProvider userProvider,
    IMediator mediator) : IManagementUserProvider
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
        var actorRank = actorRoles.Count > 0 ? actorRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0)) : 0;

        var targetRoles = await userManager.GetRolesAsync(targetUser);
        var targetRank = targetRoles.Count > 0 ? targetRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0)) : 0;

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
        if (!RoleRanks.ContainsKey(role))
            return false;

        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        // Verify the actor outranks both the TARGET's current highest role, and the ROLE being assigned
        var context = httpContextAccessor.HttpContext;
        if (context == null || context.User.Identity?.IsAuthenticated != true)
            return false;
            
        var actorRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var actorRank = actorRoles.Count > 0 ? actorRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0)) : 0;
        
        var assignmentRank = RoleRanks.GetValueOrDefault(role, 0);
        if (actorRank <= assignmentRank)
            return false; // Can't assign a role equal or higher than oneself

        if (!await ValidateHierarchyAsync(targetUser))
            return false; // Can't modify someone equal or higher than oneself

        // Strip existing operational roles, except maybe User
        var rolesToRemove = await userManager.GetRolesAsync(targetUser);
        if (rolesToRemove.Any())
        {
            var removeResult = await userManager.RemoveFromRolesAsync(targetUser, rolesToRemove);
            if (!removeResult.Succeeded)
                return false;
        }

        // Add the new role, plus User core role
        var addUserResult = await userManager.AddToRoleAsync(targetUser, RoleNames.User);
        if (!addUserResult.Succeeded)
            return false;

        if (role != RoleNames.User)
        {
            var addRoleResult = await userManager.AddToRoleAsync(targetUser, role);
            if (!addRoleResult.Succeeded)
                return false;
        }

        await userProvider.SetAuthorStatusAsync(targetUser.Id, string.Equals(role, RoleNames.Author, StringComparison.OrdinalIgnoreCase), ct);

        var description = BuildRoleChangeDescription(rolesToRemove, role);
        await mediator.Publish(new UserRoleUpdatedEvent(targetUser.Id, role, description), ct);

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

    private static string BuildRoleChangeDescription(IEnumerable<string> previousRoles, string newRole)
    {
        var oldRoles = previousRoles
            .Where(role => !string.Equals(role, RoleNames.User, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var hadAuthorAccess = oldRoles.Any(role => string.Equals(role, RoleNames.Author, StringComparison.OrdinalIgnoreCase));
        if (hadAuthorAccess && !string.Equals(newRole, RoleNames.Author, StringComparison.OrdinalIgnoreCase))
        {
            return "Yazar yetkileriniz askıya alındı. Yeni erişim seviyeniz hesabınıza uygulandı.";
        }

        return newRole switch
        {
            RoleNames.Author => "Hesabınıza yazar yetkisi tanımlandı.",
            RoleNames.Mod => "Hesabınıza moderatör yetkisi tanımlandı.",
            RoleNames.Admin => "Hesabınıza yönetici yetkisi tanımlandı.",
            RoleNames.SuperAdmin => "Hesabınıza super admin yetkisi tanımlandı.",
            _ => "Yetki seviyeniz güncellendi."
        };
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

        if (users.Count == 0)
        {
            return users;
        }

        var userIds = users.Select(x => x.Id).ToList();

        var userRoleRows = await (
            from userRole in identityDbContext.UserRoles.AsNoTracking()
            join role in identityDbContext.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where userIds.Contains(userRole.UserId)
            select new
            {
                userRole.UserId,
                RoleName = role.Name
            })
            .ToListAsync(ct);

        var rolesByUserId = userRoleRows
            .Where(x => !string.IsNullOrWhiteSpace(x.RoleName))
            .GroupBy(x => x.UserId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.RoleName!).Distinct().ToList());

        foreach (var userDto in users)
        {
            userDto.Roles = rolesByUserId.TryGetValue(userDto.Id, out var roles) ? roles : [];
        }

        return users;
    }
}
