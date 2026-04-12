using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Users.UpdateRole;

public class UpdateUserRoleRequest
{
    public Guid TargetUserId { get; set; }
    public List<string> Roles { get; set; } = new();
}

[AuditLog("Update User Role")]
public class UpdateUserRoleEndpoint(IManagementUserProvider userProvider) : Endpoint<UpdateUserRoleRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/users/{TargetUserId}/role");
        Policies(PolicyNames.AdminAccess); 
        Summary(s =>
        {
            s.Summary = "Update User Role";
            s.Description = "Changes a user's roles if the actor outranks them and the new roles.";
            s.Responses[200] = "Roles successfully updated.";
            s.Responses[403] = "Hierarchy mismatch; cannot assign roles.";
            s.Responses[404] = "User not found.";
        });
    }

    public override async Task HandleAsync(UpdateUserRoleRequest req, CancellationToken ct)
    {
        if (req.Roles == null || !req.Roles.Any())
        {
            await Send.ResponseAsync(Result<string>.Failure("At least one role is required."), 400, ct);
            return;
        }

        var success = await userProvider.UpdateUserRoleAsync(req.TargetUserId, req.Roles, ct);
        
        if (success)
        {
            await Send.ResponseAsync(Result<string>.Success("Roles updated successfully."), 200, ct);
        }
        else
        {
            await Send.ResponseAsync(Result<string>.Failure("Hierarchy mismatch, user not found, or invalid roles."), 403, ct);
        }
    }
}
