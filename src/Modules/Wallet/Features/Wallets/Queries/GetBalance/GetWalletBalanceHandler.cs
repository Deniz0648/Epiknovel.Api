using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Wallet.Features.Wallets.Queries.GetBalance;

public class GetWalletBalanceHandler(WalletDbContext dbContext) : IRequestHandler<GetWalletBalanceQuery, Result<WalletBalanceResponse>>
{
    public async Task<Result<WalletBalanceResponse>> Handle(GetWalletBalanceQuery request, CancellationToken ct)
    {
        var wallet = await dbContext.Wallets
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.UserId == request.UserId, ct);

        if (wallet == null)
        {
            return Result<WalletBalanceResponse>.Success(new WalletBalanceResponse
            {
                CoinBalance = 0,
                RevenueBalance = 0
            });
        }

        return Result<WalletBalanceResponse>.Success(new WalletBalanceResponse
        {
            CoinBalance = wallet.CoinBalance,
            RevenueBalance = wallet.RevenueBalance
        });
    }
}
