using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Wallet.EventHandlers;

public class UserRegisteredEventHandler(WalletDbContext dbContext) : INotificationHandler<UserRegisteredEvent>
{
    public async Task Handle(UserRegisteredEvent notification, CancellationToken ct)
    {
        // Yalnızca kullanıcı için bir cüzdan yoksa oluştur.
        var exists = await dbContext.Wallets.AnyAsync(w => w.UserId == notification.UserId, ct);
        if (exists) return;

        var initialWallet = new Domain.Wallet
        {
            UserId = notification.UserId,
            CoinBalance = 25, // Hoşgeldin Hediyesi
            RevenueBalance = 0,
            Version = 1
        };

        var transaction = new WalletTransaction
        {
            UserId = notification.UserId,
            Wallet = initialWallet, // Navigation property seti
            CoinAmount = 25,
            Type = TransactionType.Adjustment,
            Description = "Hoşgeldin Hediyesi",
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Wallets.Add(initialWallet);
        dbContext.WalletTransactions.Add(transaction);

        await dbContext.SaveChangesAsync(ct);
    }
}
