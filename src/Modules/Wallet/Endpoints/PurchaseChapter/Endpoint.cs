using FastEndpoints;
using Epiknovel.Modules.Wallet.Features.Purchases.Commands.PurchaseChapter;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Wallet.Endpoints.PurchaseChapter;

public record Request
{
    public Guid ChapterId { get; init; }
}

[AuditLog("Bölüm Kilidi Açıldı")]
public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/wallet/purchase-chapter");
        Summary(s => {
            s.Summary = "Bölüm satın al (Kilidi aç).";
            s.Description = "Kullanıcının coin bakiyesini kullanarak ücretli bir bölümün kilidini açmasını sağlar. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new PurchaseChapterCommand(userId, req.ChapterId), ct);

        if (!result.IsSuccess)
        {
            var statusCode = result.Message.Contains("bulunamadı") ? 404 : 400;
            await Send.ResponseAsync(result, statusCode, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
