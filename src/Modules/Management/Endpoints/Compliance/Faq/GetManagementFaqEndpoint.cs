using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Faq;

[AuditLog("View Management FAQ")]
public class GetManagementFaqEndpoint(ManagementDbContext dbContext) : EndpointWithoutRequest<Result<List<FAQ>>>
{
    public override void Configure()
    {
        Get("/management/compliance/faq");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var faqs = await dbContext.FAQs.AsNoTracking().OrderBy(x => x.Order).ToListAsync(ct);
        await Send.ResponseAsync(Result<List<FAQ>>.Success(faqs), 200, ct);
    }
}
