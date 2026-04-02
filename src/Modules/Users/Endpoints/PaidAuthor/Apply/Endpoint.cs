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
    public IFormFile ExemptionCertificate { get; init; } = null!;
    public IFormFile BankDocument { get; init; } = null!;
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
        AllowFileUploads();
        Throttle(3, 60);
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvurusu yap.";
            s.Description = "Gerekli evrakları (İstisna Belgesi, Banka Dekontu vb.) yükleyerek başvuru yapar. MediatR standardı uygulanmıştır.";
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
            req.ExemptionCertificate,
            req.BankDocument,
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
