using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Commands.Wallet;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Wallet.Handlers;

public class DeductBalanceForPayoutCommandHandler(WalletDbContext dbContext) : IRequestHandler<DeductBalanceForPayoutCommand, Result<string>>
{
    public async Task<Result<string>> Handle(DeductBalanceForPayoutCommand request, CancellationToken ct)
    {
        // 🛡️ IDEMPOTENCY: Bu PayoutRequest için daha önce işlem yapılmış mı? (Double-Spending Koruması)
        var exists = await dbContext.WalletTransactions
            .AnyAsync(x => x.ReferenceId == request.PayoutRequestId && x.Type == TransactionType.Withdrawal, ct);

        if (exists)
        {
            return Result<string>.Success("Bakiye bu talep için zaten düşülmüş (İdempozans Koruma).");
        }

        var wallet = await dbContext.Wallets
            .Include(w => w.Transactions)
            .FirstOrDefaultAsync(w => w.UserId == request.UserId, ct);

        if (wallet == null)
            return Result<string>.Failure("Wallet not found for the user.");

        if (wallet.RevenueBalance < request.Amount)
            return Result<string>.Failure("Insufficient balance.");

        // Deduct balance
        wallet.RevenueBalance -= request.Amount;

        // Log transaction
        wallet.Transactions.Add(new WalletTransaction
        {
            UserId = request.UserId,
            CoinAmount = 0, // It's a revenue (fiat) withdrawal
            FiatAmount = -request.Amount,
            Type = TransactionType.Withdrawal,
            ReferenceId = request.PayoutRequestId,
            Description = $"Payout request approved. Request ID: {request.PayoutRequestId}",
            CreatedAt = DateTime.UtcNow
        });

        await dbContext.SaveChangesAsync(ct);
        
        return Result<string>.Success("Balance deducted successfully.");
    }
}
