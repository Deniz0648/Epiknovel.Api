using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Users.GetBooks;

public class Request
{
    public Guid Id { get; set; }
    public int Page { get; set; } = 1;
    public int Take { get; set; } = 10;
}

public class Endpoint(IManagementUserProvider userProvider) : Endpoint<Request, Result<List<UserBookDto>>>
{
    public override void Configure()
    {
        Get("/management/users/{Id}/books");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var books = await userProvider.GetUserBooksAsync(req.Id, req.Page, req.Take, ct);
        await Send.ResponseAsync(Result<List<UserBookDto>>.Success(books), 200, ct);
    }
}
