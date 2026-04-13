using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Author.List;

public class Endpoint(IAuthorApplicationService applicationService) : Endpoint<Request, Result<List<AuthorApplicationDto>>>
{
    public override void Configure()
    {
        Get("/management/author-applications");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Yazarlık başvurularını listeler.";
            s.Description = "Filtreleme desteği ile tüm yazar başvurularını döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await applicationService.GetAuthorApplicationsAsync(req.Status, ct);
        await Send.ResponseAsync(result, 200, ct);
    }
}

public class Request
{
    [QueryParam]
    public ApplicationStatus? Status { get; set; }
}
