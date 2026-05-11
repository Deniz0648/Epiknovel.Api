using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Users.GetPurchases;

public class Request
{
    public Guid Id { get; set; }
    public int Page { get; set; } = 1;
    public int Take { get; set; } = 20;
}

public class Endpoint(IManagementUserProvider userProvider) : Endpoint<Request, Result<List<UserPurchasedChapterDto>>>
{
    public override void Configure()
    {
        Get("/management/users/{Id}/purchases");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var purchases = await userProvider.GetUserPurchasedChaptersAsync(req.Id, req.Page, req.Take, ct);
        await Send.ResponseAsync(Result<List<UserPurchasedChapterDto>>.Success(purchases), 200, ct);
    }
}
