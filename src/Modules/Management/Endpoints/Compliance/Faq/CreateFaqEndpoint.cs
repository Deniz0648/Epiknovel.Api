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
    private const int MaxQuestionLength = 300;
    private const int MaxAnswerLength = 10000;
    private const int MaxCategoryLength = 100;
    private const int MaxOrder = 10000;

    public override void Configure()
    {
        Post("/management/compliance/faq");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CreateFaqRequest req, CancellationToken ct)
    {
        var question = (req.Question ?? string.Empty).Trim();
        var answer = (req.Answer ?? string.Empty).Trim();
        var category = string.IsNullOrWhiteSpace(req.Category) ? null : req.Category.Trim();

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
        if (category is not null && category.Length > MaxCategoryLength)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Kategori en fazla {MaxCategoryLength} karakter olabilir."), 400, ct);
            return;
        }
        if (req.Order < 0 || req.Order > MaxOrder)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Sira degeri 0 ile {MaxOrder} arasinda olmalidir."), 400, ct);
            return;
        }

        var faq = new FAQ
        {
            Question = question,
            Answer = answer,
            Order = req.Order,
            Category = category,
            IsActive = true
        };

        dbContext.FAQs.Add(faq);
        await dbContext.SaveChangesAsync(ct);
        
        await Send.ResponseAsync(Result<string>.Success("SSS sorusu basariyla eklendi."), 201, ct);
    }
}
