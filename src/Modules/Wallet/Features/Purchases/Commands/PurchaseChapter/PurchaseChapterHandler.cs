using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces.Books;
using Epiknovel.Modules.Wallet.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Wallet.Features.Purchases.Commands.PurchaseChapter;

public class PurchaseChapterHandler(
    WalletDbContext dbContext, 
    IBookProvider bookProvider, 
    ISystemSettingProvider settingsManager) : IRequestHandler<PurchaseChapterCommand, Result<string>>
{
    public async Task<Result<string>> Handle(PurchaseChapterCommand request, CancellationToken ct)
    {
        var strategy = dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            // 1. Check if already unlocked
            var alreadyUnlocked = await dbContext.UserUnlockedChapters
                .AsNoTracking()
                .AnyAsync(u => u.UserId == request.UserId && u.ChapterId == request.ChapterId, ct);

            if (alreadyUnlocked)
            {
                return Result<string>.Success("Bu bölüme zaten sahipsiniz.");
            }

            // 2. Get Chapter Info from Books Module
            int price;
            Guid authorId;
            try
            {
                price = await bookProvider.GetChapterPriceAsync(request.ChapterId, ct);
                authorId = await bookProvider.GetChapterAuthorIdAsync(request.ChapterId, ct);
            }
            catch (KeyNotFoundException)
            {
                return Result<string>.Failure("Bölüm bulunamadı.");
            }

            if (price == 0)
            {
                return Result<string>.Failure("Bu bölüm ücretsizdir, satın alma işlemi yapılamaz.");
            }

            // 3. Financial Snapshots
            decimal authorShare = await settingsManager.GetAuthorSharePercentageAsync(ct);
            decimal coinParam = await settingsManager.GetCoinToCurrencyRateAsync(ct);

            decimal grossFiatEarned = price * coinParam;
            decimal netFiatToAuthor = grossFiatEarned * authorShare;

            // 4. ACID Transaction
            await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);

            try
            {
                // --- USER WALLET ---
                var userWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == request.UserId, ct);

                if (userWallet == null || userWallet.CoinBalance < price)
                {
                    return Result<string>.Failure("Bakiye yetersiz.");
                }

                userWallet.CoinBalance -= price;

                var userTx = new WalletTransaction
                {
                    UserId = request.UserId,
                    Wallet = userWallet,
                    CoinAmount = -price,
                    FiatAmount = -grossFiatEarned,
                    AppliedAuthorShare = authorShare,
                    AppliedCoinPrice = coinParam,
                    Type = TransactionType.Unlock,
                    ReferenceId = request.ChapterId,
                    Description = "Bölüm Kilidi Açma"
                };
                dbContext.WalletTransactions.Add(userTx);

                // --- AUTHOR WALLET ---
                var authorWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == authorId, ct);
                if (authorWallet == null)
                {
                    authorWallet = new Domain.Wallet
                    {
                        UserId = authorId,
                        CoinBalance = 0,
                        RevenueBalance = netFiatToAuthor,
                        Version = 1
                    };
                    dbContext.Wallets.Add(authorWallet);
                }
                else
                {
                    authorWallet.RevenueBalance += netFiatToAuthor;
                }

                var authorTx = new WalletTransaction
                {
                    UserId = authorId,
                    Wallet = authorWallet,
                    CoinAmount = price,
                    FiatAmount = netFiatToAuthor,
                    AppliedAuthorShare = authorShare,
                    AppliedCoinPrice = coinParam,
                    Type = TransactionType.Revenue,
                    ReferenceId = request.ChapterId,
                    Description = "Bölüm Satış Geliri (Net TL)"
                };
                dbContext.WalletTransactions.Add(authorTx);

                // --- UNLOCK LOG ---
                var unlockedLog = new UserUnlockedChapter
                {
                    UserId = request.UserId,
                    ChapterId = request.ChapterId,
                    BookId = Guid.Empty,
                    PricePaid = price,
                    RevenueOwnerId = authorId
                };
                dbContext.UserUnlockedChapters.Add(unlockedLog);

                await dbContext.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                return Result<string>.Success("Bölüm başarıyla satın alındı.");
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                return Result<string>.Failure("Aynı anda çok fazla işlem yapıldı. Lütfen tekrar deneyin.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(ct);
                return Result<string>.Failure($"Beklenmedik bir hata oluştu: {ex.Message}");
            }
        });
    }
}
