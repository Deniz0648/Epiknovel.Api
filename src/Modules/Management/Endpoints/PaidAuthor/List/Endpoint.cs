using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.PaidAuthor.List;

public class Endpoint(IAuthorApplicationService applicationService) : Endpoint<Request, Result<List<PaidAuthorApplicationDto>>>
{
    public override void Configure()
    {
        Get("/management/paid-author-applications");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvurularını listeler.";
            s.Description = "Filtreleme desteği ile tüm ücretli yazar başvurularını döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await applicationService.GetPaidAuthorApplicationsAsync(req.Status, ct);
        await Send.ResponseAsync(result, 200, ct);
    }
}

public class Request
{
    [QueryParam]
    public ApplicationStatus? Status { get; set; }
}
