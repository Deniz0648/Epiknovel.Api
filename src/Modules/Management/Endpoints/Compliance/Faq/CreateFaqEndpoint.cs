using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Faq;

public class CreateFaqRequest
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Order { get; set; }
    public string? Category { get; set; }
}

[AuditLog("Create Management FAQ")]
public class CreateFaqEndpoint(ManagementDbContext dbContext) : Endpoint<CreateFaqRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/compliance/faq");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CreateFaqRequest req, CancellationToken ct)
    {
        var faq = new FAQ
        {
            Question = req.Question,
            Answer = req.Answer,
            Order = req.Order,
            Category = req.Category,
            IsActive = true
        };

        dbContext.FAQs.Add(faq);
        await dbContext.SaveChangesAsync(ct);
        
        await Send.ResponseAsync(Result<string>.Success("SSS sorusu basariyla eklendi."), 201, ct);
    }
}
