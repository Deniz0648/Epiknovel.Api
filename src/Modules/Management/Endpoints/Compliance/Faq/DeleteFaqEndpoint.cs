using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Faq;

[AuditLog("Delete Management FAQ")]
public class DeleteFaqEndpoint(ManagementDbContext dbContext) : EndpointWithoutRequest<Result<string>>
{
    public override void Configure()
    {
        Delete("/management/compliance/faq/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<Guid>("Id");
        var faq = await dbContext.FAQs.FindAsync([id], ct);
        
        if (faq == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("SSS sorusu bulunamadi."), 404, ct);
            return;
        }

        dbContext.FAQs.Remove(faq);
        await dbContext.SaveChangesAsync(ct);
        
        await Send.ResponseAsync(Result<string>.Success("SSS sorusu basariyla silindi."), 200, ct);
    }
}
