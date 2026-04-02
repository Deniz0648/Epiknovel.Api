using FastEndpoints;
using Epiknovel.Modules.Management.Features.PaidAuthorApplications.Commands.ReviewApplication;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Modules.Management.Domain;

namespace Epiknovel.Modules.Management.Endpoints.PaidAuthor.Review;

public record Request
{
    public Guid ApplicationId { get; init; }
    public ApplicationStatus Status { get; init; } // Approved, Rejected
    public string? AdminNote { get; init; }
}

[AuditLog("Ücretli Yazarlık Başvurusu İncelendi")]
public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/management/paid-author/review");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvurusunu incele.";
            s.Description = "Adminlerin kullanıcıların ücretli başvurularını onaylamasını/reddetmesini sağlar. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var adminIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(adminIdString, out var adminId);

        var result = await mediator.Send(new ReviewPaidAuthorApplicationCommand(
            req.ApplicationId,
            req.Status,
            req.AdminNote,
            adminId
        ), ct);

        if (!result.IsSuccess)
        {
            var statusCode = result.Message.Contains("bulunamadı") ? 404 : 400;
            await Send.ResponseAsync(result, statusCode, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
