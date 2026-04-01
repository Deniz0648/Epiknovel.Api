using Microsoft.AspNetCore.Authorization;

namespace Epiknovel.Shared.Infrastructure.Security;

public sealed class PermissionRequirement(string permission) : IAuthorizationRequirement
{
    public string Permission { get; } = permission;
}
