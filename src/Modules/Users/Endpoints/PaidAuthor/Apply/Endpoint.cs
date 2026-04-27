using FastEndpoints;
using Epiknovel.Modules.Users.Features.AuthorApplications.Commands.SubmitPaidAuthorApplication;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Users.Endpoints.PaidAuthor.Apply;

public record Request
{
    public Guid ExemptionCertificateId { get; init; }
    public Guid BankDocumentId { get; init; }
    public string Iban { get; init; } = string.Empty;
    public string BankName { get; init; } = string.Empty;
}

[AuditLog("Ücretli Yazarlık Başvurusu Yapıldı")]
public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/paid-author/apply");
        Policies("BOLA");
        Throttle(3, 60);
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvurusu yap.";
            s.Description = "Compliance modülünden alınan belge ID'lerini kullanarak başvuru yapar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new SubmitPaidAuthorApplicationCommand(
            userId,
            req.ExemptionCertificateId,
            req.BankDocumentId,
            req.Iban,
            req.BankName
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(result, 400, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
