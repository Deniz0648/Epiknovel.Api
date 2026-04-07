using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Faq;

public class UpdateFaqRequest
{
    public Guid Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Order { get; set; }
}

[AuditLog("Update FAQ")]
public class UpdateFaqEndpoint(ManagementDbContext dbContext) : Endpoint<UpdateFaqRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/compliance/faq/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateFaqRequest req, CancellationToken ct)
    {
        var faq = await dbContext.FAQs.FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (faq == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("SSS bulunamadi."), 404, ct);
            return;
        }

        faq.Question = req.Question;
        faq.Answer = req.Answer;
        faq.Order = req.Order;

        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<string>.Success("SSS guncellendi."), 200, ct);
    }
}
