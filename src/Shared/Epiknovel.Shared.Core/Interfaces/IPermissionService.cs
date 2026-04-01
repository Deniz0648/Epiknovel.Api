using System.Security.Claims;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Shared.Core.Interfaces;

public interface IPermissionService
{
    Task<bool> HasPermissionAsync(ClaimsPrincipal user, string permission, CancellationToken ct = default);
    Task<PermissionSnapshot> GetSnapshotAsync(ClaimsPrincipal user, CancellationToken ct = default);
}
