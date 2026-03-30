using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Admin.FAQ.Add;

public record Request
{
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
    public int Order { get; init; }
    public string? Category { get; init; }
}

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/management/admin/faq");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Sıkça sorulan soru (SSS) ekle.";
            s.Description = "Sisteme yeni bir Sıkça Sorulan Soru ve cevabını ekler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var faq = new Domain.FAQ
        {
            Question = req.Question,
            Answer = req.Answer,
            Order = req.Order,
            Category = req.Category,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.FAQs.Add(faq);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(faq.Id), 200, ct);
    }
}
