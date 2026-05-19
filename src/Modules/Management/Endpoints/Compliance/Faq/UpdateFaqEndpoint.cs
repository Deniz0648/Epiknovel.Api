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
    private const int MaxQuestionLength = 300;
    private const int MaxAnswerLength = 10000;
    private const int MaxOrder = 10000;

    public override void Configure()
    {
        Put("/management/compliance/faq/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateFaqRequest req, CancellationToken ct)
    {
        var routeId = Route<Guid>("Id");
        if (routeId == Guid.Empty || req.Id == Guid.Empty || routeId != req.Id)
        {
            await Send.ResponseAsync(Result<string>.Failure("Route Id ve payload Id eslesmiyor."), 400, ct);
            return;
        }

        var question = (req.Question ?? string.Empty).Trim();
        var answer = (req.Answer ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(question))
        {
            await Send.ResponseAsync(Result<string>.Failure("Soru alani bos olamaz."), 400, ct);
            return;
        }
        if (string.IsNullOrWhiteSpace(answer))
        {
            await Send.ResponseAsync(Result<string>.Failure("Cevap alani bos olamaz."), 400, ct);
            return;
        }
        if (question.Length > MaxQuestionLength)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Soru en fazla {MaxQuestionLength} karakter olabilir."), 400, ct);
            return;
        }
        if (answer.Length > MaxAnswerLength)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Cevap en fazla {MaxAnswerLength} karakter olabilir."), 400, ct);
            return;
        }
        if (req.Order < 0 || req.Order > MaxOrder)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Sira degeri 0 ile {MaxOrder} arasinda olmalidir."), 400, ct);
            return;
        }

        var faq = await dbContext.FAQs.FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (faq == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("SSS bulunamadi."), 404, ct);
            return;
        }

        faq.Question = question;
        faq.Answer = answer;
        faq.Order = req.Order;

        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<string>.Success("SSS guncellendi."), 200, ct);
    }
}
