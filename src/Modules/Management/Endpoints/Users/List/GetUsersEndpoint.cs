using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Users.List;

public record GetUsersRequest
{
    public DateTime? Cursor { get; init; }
    public int Take { get; init; } = 50;
    public string? Search { get; init; }
}

public class GetUsersEndpoint(IManagementUserProvider userProvider) : Endpoint<GetUsersRequest, Result<List<UserManagementDto>>>
{
    public override void Configure()
    {
        Get("/management/users");
        Policies(PolicyNames.ModAccess); // Moderator-tier can list users but maybe only Admins can ban (per Ban endpoint)
        Summary(s =>
        {
            s.Summary = "Get users (Cursor Paginated)";
            s.Description = "Returns a paginated list of users with their basic info and roles.";
        });
    }

    public override async Task HandleAsync(GetUsersRequest req, CancellationToken ct)
    {
        var take = Math.Min(req.Take, 100);
        var users = await userProvider.GetPaginatedUsersAsync(req.Cursor, take, req.Search, ct);
        
        await Send.ResponseAsync(Result<List<UserManagementDto>>.Success(users), 200, ct);
    }
}
