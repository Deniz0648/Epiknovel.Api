using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces.Books;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Modules.Wallet.Services;

namespace Epiknovel.Modules.Wallet.Endpoints.PurchaseChapter;

public record Request
{
    public Guid ChapterId { get; init; }
}

public class Endpoint(WalletDbContext dbContext, IBookProvider bookProvider, ISystemSettingProvider settingsManager) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/wallet/purchase-chapter");
        // Varsayılan authorize
        Summary(s => {
            s.Summary = "Bölüm satın al (Kilidi aç).";
            s.Description = "Kullanıcının coin bakiyesini kullanarak ücretli bir bölümün kilidini açmasını sağlar. Yazara net TL olarak gelir aktarılır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var alreadyUnlocked = await dbContext.UserUnlockedChapters
            .AsNoTracking()
            .AnyAsync(u => u.UserId == userId && u.ChapterId == req.ChapterId, ct);

        if (alreadyUnlocked)
        {
            await Send.ResponseAsync(Result<string>.Success("Bu bölüme zaten sahipsiniz."), 200, ct);
            return;
        }

        int price;
        Guid authorId;
        try
        {
            price = await bookProvider.GetChapterPriceAsync(req.ChapterId, ct);
            authorId = await bookProvider.GetChapterAuthorIdAsync(req.ChapterId, ct);
        }
        catch (KeyNotFoundException)
        {
            await Send.ResponseAsync(Result<string>.Failure("Not Found"), 404, ct); 
            return;
        }

        if (price == 0)
        {
            ThrowError("Bu bölüm ücretsizdir, satın alma işlemi yapılamaz.");
            return;
        }
        
        // 4. Güncel Finansal Kurları Çek (Snapshot için)
        decimal authorShare = await settingsManager.GetAuthorSharePercentageAsync(ct);
        decimal coinParam = await settingsManager.GetCoinToCurrencyRateAsync(ct);

        // Hesaplamalar (Net TL)
        decimal grossFiatEarned = price * coinParam;   // Toplam Ciro (Eğer 10 coin ise * 0.15 = 1.50 TL)
        decimal netFiatToAuthor = grossFiatEarned * authorShare; // Yazarın Net Payı (TL olarak)

        using var transaction = await dbContext.Database.BeginTransactionAsync(ct);

        try
        {
            // --- KULLANICI İŞLEMLERİ ---
            var userWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
            
            if (userWallet == null || userWallet.CoinBalance < price)
            {
                ThrowError("Bakiye yetersiz.");
                return;
            }

            userWallet.CoinBalance -= price; // CHECK constraint güvence altına alıyor

            var userTx = new WalletTransaction
            {
                UserId = userId,
                Wallet = userWallet,
                CoinAmount = -price, // Kullanıcıdan brüt coin düşer
                FiatAmount = -grossFiatEarned, // Bu işlemin Fiat Maliyeti
                AppliedAuthorShare = authorShare, // O anki kur mühürlenir
                AppliedCoinPrice = coinParam,
                Type = TransactionType.Unlock,
                ReferenceId = req.ChapterId,
                Description = "Bölüm Kilidi Açma"
            };
            dbContext.WalletTransactions.Add(userTx);

            // --- YAZAR (NET TL) GELİR İŞLEMLERİ ---
            var authorWallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == authorId, ct);
            if (authorWallet == null)
            {
                authorWallet = new Domain.Wallet
                {
                    UserId = authorId,
                    CoinBalance = 0,
                    RevenueBalance = netFiatToAuthor, // Artık Net TL tutuyoruz!
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
                FiatAmount = netFiatToAuthor, // Yazar kasasına Net Fiat girer
                AppliedAuthorShare = authorShare,
                AppliedCoinPrice = coinParam,
                Type = TransactionType.Revenue,
                ReferenceId = req.ChapterId,
                Description = "Bölüm Satış Geliri (Net TL)"
            };
            dbContext.WalletTransactions.Add(authorTx);

            // --- YETKİ KAYDI ---
            var unlockedLog = new UserUnlockedChapter
            {
                UserId = userId,
                ChapterId = req.ChapterId,
                BookId = Guid.Empty, // Gelecekte Book Id eklenecek
                PricePaid = price,
                RevenueOwnerId = authorId
            };
            dbContext.UserUnlockedChapters.Add(unlockedLog);

            await dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(ct);
            ThrowError("Aynı anda çok fazla işlem yapıldı. Lütfen tekrar deneyin.");
        }
        catch (Exception)
        {
            await transaction.RollbackAsync(ct);
            throw; 
        }

        await Send.ResponseAsync(Result<string>.Success("Bölüm başarıyla satın alındı."), 200, ct);
    }
}
