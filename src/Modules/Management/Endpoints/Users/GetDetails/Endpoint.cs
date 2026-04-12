using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Users.GetDetails;

public class Endpoint(IManagementUserProvider userProvider) : Endpoint<Request, Result<UserManagementDetailDto>>
{
    public override void Configure()
    {
        Get("/management/users/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var details = await userProvider.GetUserDetailsAsync(req.Id, ct);
        if (details == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.ResponseAsync(Result<UserManagementDetailDto>.Success(details), 200, ct);
    }
}
