using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Users.Ban;

public class BanUserRequest
{
    public Guid TargetUserId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

[AuditLog("Ban User")]
public class BanUserEndpoint(IManagementUserProvider userProvider) : Endpoint<BanUserRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/users/{TargetUserId}/ban");
        Policies(PolicyNames.ModAccess);
        Summary(s =>
        {
            s.Summary = "Ban User";
            s.Description = "Bans a user from the platform if the actor outranks them.";
            s.Responses[200] = "User successfully banned.";
            s.Responses[403] = "Hierarchy mismatch; cannot ban higher-ranking users.";
            s.Responses[404] = "User not found.";
        });
    }

    public override async Task HandleAsync(BanUserRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Reason))
        {
            await Send.ResponseAsync(Result<string>.Failure("A reason is required to ban a user."), 400, ct);
            return;
        }

        var success = await userProvider.BanUserAsync(req.TargetUserId, req.Reason, ct);
        
        if (success)
        {
            await Send.ResponseAsync(Result<string>.Success("User was banned successfully."), 200, ct);
        }
        else
        {
            await Send.ResponseAsync(Result<string>.Failure("Hierarchy mismatch or user not found."), 403, ct);
        }
    }
}
