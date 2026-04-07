using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public class AssignBookMembersRequest
{
    public Guid BookId { get; set; }
    public List<BookMemberAssignmentDto> Members { get; set; } = new();
}

[AuditLog("Assign Book Members")]
public class AssignBookMembersEndpoint(IManagementBookProvider bookProvider) : Endpoint<AssignBookMembersRequest, Result<bool>>
{
    public override void Configure()
    {
        Post("/management/compliance/books/{bookId}/members");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(AssignBookMembersRequest req, CancellationToken ct)
    {
        var success = await bookProvider.AssignBookMembersAsync(req.BookId, req.Members, ct);
        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.ResponseAsync(Result<bool>.Success(true, "Yazarlar başarıyla atandı."), 200, ct);
    }
}
