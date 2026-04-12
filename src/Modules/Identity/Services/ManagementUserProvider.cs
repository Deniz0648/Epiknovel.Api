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
    IMediator mediator,
    Epiknovel.Shared.Core.Interfaces.Wallet.IWalletProvider walletProvider,
    Epiknovel.Shared.Core.Interfaces.Books.IBookProvider bookProvider) : IManagementUserProvider
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

        // 1. Self-modification is allowed
        var actorIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (actorIdStr == targetUser.Id.ToString())
            return true;

        // 2. SuperAdmins can manage anyone
        var actorRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        if (actorRoles.Contains(RoleNames.SuperAdmin))
            return true;

        // 3. Regular admins/mods must outrank the target
        var actorRank = actorRoles.Count > 0 ? actorRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0)) : 0;
        var targetRoles = await userManager.GetRolesAsync(targetUser);
        var targetRank = targetRoles.Count > 0 ? targetRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0)) : 0;

        return actorRank > targetRank;
    }

    public async Task<bool> BanUserAsync(Guid userId, string reason, CancellationToken ct = default)
    {
        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        if (!await ValidateHierarchyAsync(targetUser))
            return false;

        targetUser.IsBanned = true;
        targetUser.BanReason = reason;
        targetUser.LockoutEnd = DateTimeOffset.MaxValue; 
        
        var result = await userManager.UpdateAsync(targetUser);
        return result.Succeeded;
    }

    public async Task<bool> UnbanUserAsync(Guid userId, CancellationToken ct = default)
    {
        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        if (!await ValidateHierarchyAsync(targetUser))
            return false;

        targetUser.IsBanned = false;
        targetUser.BanReason = null;
        targetUser.LockoutEnd = null;
        var result = await userManager.UpdateAsync(targetUser);
        return result.Succeeded;
    }

    public async Task<bool> UpdateUserRoleAsync(Guid userId, IEnumerable<string> roles, CancellationToken ct = default)
    {
        var roleList = roles.Distinct().ToList();
        if (roleList.Any(r => !RoleRanks.ContainsKey(r)))
            return false;

        var targetUser = await userManager.FindByIdAsync(userId.ToString());
        if (targetUser == null) return false;

        // Verify the actor outranks both the TARGET's current highest role, and the NEW HIGHEST role being assigned
        var context = httpContextAccessor.HttpContext;
        if (context == null || context.User.Identity?.IsAuthenticated != true)
            return false;
            
        var actorRoles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var actorRank = actorRoles.Count > 0 ? actorRoles.Max(r => RoleRanks.GetValueOrDefault(r, 0)) : 0;
        
        var assignmentRank = roleList.Count > 0 ? roleList.Max(r => RoleRanks.GetValueOrDefault(r, 0)) : 0;
        if (actorRank <= assignmentRank && !actorRoles.Contains(RoleNames.SuperAdmin))
            return false; // Can't assign a role equal or higher than oneself (unless SuperAdmin)

        if (!await ValidateHierarchyAsync(targetUser))
            return false; // Can't modify someone equal or higher than oneself

        // Ensure User role is always present
        if (!roleList.Contains(RoleNames.User))
            roleList.Add(RoleNames.User);

        var currentRoles = await userManager.GetRolesAsync(targetUser);
        
        var rolesToAdd = roleList.Except(currentRoles).ToList();
        var rolesToRemove = currentRoles.Except(roleList).ToList();

        if (rolesToRemove.Any())
        {
            var removeResult = await userManager.RemoveFromRolesAsync(targetUser, rolesToRemove);
            if (!removeResult.Succeeded)
                return false;
        }

        if (rolesToAdd.Any())
        {
            var addResult = await userManager.AddToRolesAsync(targetUser, rolesToAdd);
            if (!addResult.Succeeded)
                return false;
        }

        // Update Author status (true if Author role exists now)
        var isAuthor = roleList.Any(r => string.Equals(r, RoleNames.Author, StringComparison.OrdinalIgnoreCase));
        await userProvider.SetAuthorStatusAsync(targetUser.Id, isAuthor, ct);

        // Notify
        var description = $"Yetki seviyeleriniz güncellendi. Yeni roller: {string.Join(", ", roleList)}";
        await mediator.Publish(new UserRoleUpdatedEvent(targetUser.Id, string.Join("|", roleList), description), ct);

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
                IsBanned = u.IsBanned || (u.LockoutEnd.HasValue && u.LockoutEnd.Value > DateTimeOffset.UtcNow)
            })
            .ToListAsync(ct);

        if (users.Count == 0)
        {
            return users;
        }

        var userIds = users.Select(x => x.Id).ToList();
        var slugs = await userProvider.GetSlugsByUserIdsAsync(userIds, ct);

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
            userDto.Slug = slugs.TryGetValue(userDto.Id, out var slug) ? slug : string.Empty;
        }

        return users;
    }

    public async Task<UserManagementDetailDto?> GetUserDetailsAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return null;

        var roles = await userManager.GetRolesAsync(user);
        var slugs = await userProvider.GetSlugsByUserIdsAsync(new[] { userId }, ct);
        
        var (balance, transactions) = await walletProvider.GetWalletSummaryAsync(userId, 10, ct);
        var (books, totalChapters) = await bookProvider.GetAuthorBooksSummaryAsync(userId, ct);
        var purchases = await walletProvider.GetUserUnlockedChaptersAsync(userId, ct);
        var enrichedPurchases = await bookProvider.GetChapterTitlesByChaptersAsync(purchases, ct);

        return new UserManagementDetailDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            DisplayName = user.DisplayName ?? string.Empty,
            Slug = slugs.TryGetValue(userId, out var slug) ? slug : string.Empty,
            CreatedAt = user.CreatedAt,
            IsBanned = user.IsBanned || (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow),
            Roles = roles.ToList(),
            TokenBalance = balance,
            RecentTransactions = transactions,
            Books = books,
            TotalChapters = totalChapters,
            PurchasedChapters = enrichedPurchases
        };
    }

    public async Task<Guid?> GetSuperAdminIdAsync(CancellationToken ct = default)
    {
        var superAdminRole = await identityDbContext.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Name == RoleNames.SuperAdmin, ct);
        if (superAdminRole == null) return null;

        var superAdminUserRole = await identityDbContext.UserRoles.AsNoTracking().FirstOrDefaultAsync(ur => ur.RoleId == superAdminRole.Id, ct);
        return superAdminUserRole?.UserId;
    }
}
