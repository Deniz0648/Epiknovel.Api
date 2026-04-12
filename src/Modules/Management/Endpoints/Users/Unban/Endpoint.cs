using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Management.Endpoints.Users.Unban;

public class Request 
{
    public Guid TargetUserId { get; set; }
}

[AuditLog("Unban User")]
public class Endpoint(IManagementUserProvider userProvider) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/management/users/{TargetUserId}/unban");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var success = await userProvider.UnbanUserAsync(req.TargetUserId, ct);
        if (success)
        {
            await Send.ResponseAsync(Result<string>.Success("User was unbanned successfully."), 200, ct);
        }
        else
        {
            await Send.ResponseAsync(Result<string>.Failure("Hierarchy mismatch or user not found."), 403, ct);
        }
    }
}
