using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public class GetManagementBooksRequest
{
    public string? Type { get; set; }
    public bool? IsHidden { get; set; }
    public bool? IsEditorChoice { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int Take { get; set; } = 25;
}

[AuditLog("View Management Books")]
public class GetManagementBooksEndpoint(IManagementBookProvider bookProvider) : Endpoint<GetManagementBooksRequest, Result<PagedResult<ManagementBookDto>>>
{
    public override void Configure()
    {
        Get("/management/compliance/books");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(GetManagementBooksRequest req, CancellationToken ct)
    {
        var result = await bookProvider.GetBooksAsync(req.Type, req.IsHidden, req.IsEditorChoice, req.Search, req.Page, req.Take, ct);
        await Send.ResponseAsync(result, 200, ct);
    }
}
