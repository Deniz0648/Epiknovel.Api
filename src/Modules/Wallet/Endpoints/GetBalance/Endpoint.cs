using FastEndpoints;
using Epiknovel.Modules.Wallet.Features.Wallets.Queries.GetBalance;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Wallet.Endpoints.GetBalance;

public class Endpoint(IMediator mediator) : EndpointWithoutRequest<Result<WalletBalanceResponse>>
{
    public override void Configure()
    {
        Get("/wallet/balance");
        Summary(s => {
            s.Summary = "Cüzdan bakiyesini getir.";
            s.Description = "Kullanıcının mevcut bakiyesini getirir. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<WalletBalanceResponse>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new GetWalletBalanceQuery(userId), ct);
        await Send.ResponseAsync(result, 200, ct);
    }
}
