using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Wallet.Features.Wallets.Queries.GetBalance;

public record GetWalletBalanceQuery(
    Guid UserId
) : IRequest<Result<WalletBalanceResponse>>;

public record WalletBalanceResponse
{
    public decimal CoinBalance { get; init; }
    public decimal RevenueBalance { get; init; }
}
