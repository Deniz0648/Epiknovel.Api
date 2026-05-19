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
    private const int MaxTake = 100;
    private const int MaxSearchLength = 120;

    public override void Configure()
    {
        Get("/management/compliance/books");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(GetManagementBooksRequest req, CancellationToken ct)
    {
        var safePage = req.Page < 1 ? 1 : req.Page;
        var safeTake = req.Take < 1 ? 25 : Math.Min(req.Take, MaxTake);
        var safeSearch = string.IsNullOrWhiteSpace(req.Search)
            ? null
            : req.Search.Trim()[..Math.Min(req.Search.Trim().Length, MaxSearchLength)];
        var result = await bookProvider.GetBooksAsync(req.Type, req.IsHidden, req.IsEditorChoice, safeSearch, safePage, safeTake, ct);
        await Send.ResponseAsync(result, 200, ct);
    }
}
