using Microsoft.AspNetCore.Authorization;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Shared.Infrastructure.Security;

public sealed class PermissionAuthorizationHandler(IPermissionService permissionService)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (await permissionService.HasPermissionAsync(context.User, requirement.Permission))
        {
            context.Succeed(requirement);
        }
    }
}
