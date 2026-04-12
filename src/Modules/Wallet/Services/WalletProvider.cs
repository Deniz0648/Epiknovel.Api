using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Interfaces.Wallet;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace Epiknovel.Modules.Wallet.Services;

public class WalletProvider(WalletDbContext dbContext, IDistributedCache cache) : IWalletProvider
{
    public async Task<bool> HasUserUnlockedChapterAsync(Guid userId, Guid chapterId, CancellationToken ct = default)
    {
        // Yazarın/kullanıcının kendi yazısı olup olmadığını veya bedava olup olmadığını Books modülü (BookProvider) ayrıca değerlendirebilir
        // Ancak biz Wallet modülü olarak sadece bu kullanıcının bu bölümü para ile açıp açmadığını sorguluyoruz.
        
        // 1. Redis Cache Kontrolü (1 saat TTL)
        var cacheKey = $"wallet_unlocked:{userId}:{chapterId}";
        var cachedVal = await cache.GetStringAsync(cacheKey, ct);
        if (cachedVal != null)
        {
            return cachedVal == "1";
        }

        // 2. DB Kontrolü
        var hasUnlocked = await dbContext.UserUnlockedChapters
            .AsNoTracking()
            .AnyAsync(u => u.UserId == userId && u.ChapterId == chapterId, ct);

        // Cache'i güncelle (Performans için)
        await cache.SetStringAsync(cacheKey, hasUnlocked ? "1" : "0", new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
        }, ct);

        return hasUnlocked;
    }

    public async Task<(decimal balance, List<Shared.Core.Interfaces.Management.WalletTransactionDto> recentTransactions)> GetWalletSummaryAsync(Guid userId, int transactionCount = 10, CancellationToken ct = default)
    {
        var wallet = await dbContext.Wallets.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId, ct);
        if (wallet == null) return (0, new());

        var txs = await dbContext.WalletTransactions
            .AsNoTracking()
            .Where(x => x.WalletId == wallet.Id)
            .OrderByDescending(x => x.CreatedAt)
            .Take(transactionCount)
            .Select(x => new Shared.Core.Interfaces.Management.WalletTransactionDto
            {
                Id = x.Id,
                Type = x.Type.ToString(),
                Amount = x.CoinAmount,
                Description = x.Description,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(ct);

        return (wallet.CoinBalance, txs);
    }

    public async Task<List<Shared.Core.Interfaces.Management.UserPurchasedChapterDto>> GetUserUnlockedChaptersAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.UserUnlockedChapters
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.UnlockedAt)
            .Select(x => new Shared.Core.Interfaces.Management.UserPurchasedChapterDto
            {
                BookId = x.BookId,
                ChapterId = x.ChapterId,
                Price = x.PricePaid,
                PurchasedAt = x.UnlockedAt
            })
            .ToListAsync(ct);
    }
}
