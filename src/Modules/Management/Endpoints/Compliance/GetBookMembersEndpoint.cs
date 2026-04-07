using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public class GetBookMembersRequest
{
    public Guid BookId { get; set; }
}

public class GetBookMembersEndpoint(IManagementBookProvider bookProvider) : Endpoint<GetBookMembersRequest, Result<List<BookMemberAssignmentDto>>>
{
    public override void Configure()
    {
        Get("/management/compliance/books/{bookId}/members");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(GetBookMembersRequest req, CancellationToken ct)
    {
        var members = await bookProvider.GetBookMembersAsync(req.BookId, ct);
        await Send.ResponseAsync(Result<List<BookMemberAssignmentDto>>.Success(members), 200, ct);
    }
}
