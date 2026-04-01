using System.Security.Claims;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Shared.Infrastructure.Security;

public sealed class PermissionService(
    IUserProvider userProvider,
    IHttpContextAccessor httpContextAccessor) : IPermissionService
{
    private const string SnapshotCacheKey = "__permission_snapshot";

    public async Task<bool> HasPermissionAsync(ClaimsPrincipal user, string permission, CancellationToken ct = default)
    {
        if (user.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var roles = GetRoles(user);
        var isSuperAdmin = roles.Contains(RoleNames.SuperAdmin);
        var isAdmin = isSuperAdmin || roles.Contains(RoleNames.Admin);
        var isModerator = isAdmin || roles.Contains(RoleNames.Mod);

        return permission switch
        {
            PermissionNames.SuperAdminAccess => isSuperAdmin,
            PermissionNames.AdminAccess => isAdmin,
            PermissionNames.ModerateContent => isModerator,
            PermissionNames.AccessAuthorPanel when isModerator => true,
            PermissionNames.AccessAuthorPanel => (await GetSnapshotAsync(user, ct)).AccessAuthorPanel,
            PermissionNames.CreateBook => (await GetSnapshotAsync(user, ct)).CreateBook,
            PermissionNames.PublishPaidChapters => (await GetSnapshotAsync(user, ct)).PublishPaidChapters,
            PermissionNames.ManageOwnBooks => (await GetSnapshotAsync(user, ct)).ManageOwnBooks,
            PermissionNames.ManageOwnChapters => (await GetSnapshotAsync(user, ct)).ManageOwnChapters,
            _ => false
        };
    }

    public async Task<PermissionSnapshot> GetSnapshotAsync(ClaimsPrincipal user, CancellationToken ct = default)
    {
        if (user.Identity?.IsAuthenticated != true)
        {
            return new PermissionSnapshot();
        }

        var cachedSnapshot = httpContextAccessor.HttpContext?.Items[SnapshotCacheKey] as PermissionSnapshot;
        if (cachedSnapshot != null)
        {
            return cachedSnapshot;
        }

        var roles = GetRoles(user);

        var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        var userId = Guid.TryParse(userIdClaim, out var parsedUserId) ? parsedUserId : Guid.Empty;
        var isAuthor = userId != Guid.Empty && await userProvider.IsAuthorAsync(userId, ct);
        var isPaidAuthor = userId != Guid.Empty && await userProvider.IsPaidAuthorAsync(userId, ct);

        var isSuperAdmin = roles.Contains(RoleNames.SuperAdmin);
        var isAdmin = isSuperAdmin || roles.Contains(RoleNames.Admin);
        var isModerator = isAdmin || roles.Contains(RoleNames.Mod);
        var canAccessAuthorPanel = isAuthor || isModerator;

        var snapshot = new PermissionSnapshot
        {
            AccessAuthorPanel = canAccessAuthorPanel,
            CreateBook = isAuthor,
            PublishPaidChapters = isPaidAuthor,
            ManageOwnBooks = isAuthor,
            ManageOwnChapters = isAuthor,
            ModerateContent = isModerator,
            AdminAccess = isAdmin,
            SuperAdminAccess = isSuperAdmin
        };

        if (httpContextAccessor.HttpContext != null)
        {
            httpContextAccessor.HttpContext.Items[SnapshotCacheKey] = snapshot;
        }

        return snapshot;
    }

    private static HashSet<string> GetRoles(ClaimsPrincipal user)
    {
        return user.FindAll(ClaimTypes.Role)
            .Select(claim => claim.Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }
}
