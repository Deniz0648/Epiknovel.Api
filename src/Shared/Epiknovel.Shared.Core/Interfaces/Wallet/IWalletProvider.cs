namespace Epiknovel.Shared.Core.Interfaces.Wallet;

public interface IWalletProvider
{
    /// <summary>
    /// Verilen kullanıcının, verilen bölümü satın alıp almadığını veya bu bölüme erişim yetkisi olup olmadığını kontrol eder.
    /// Yazarın kendi bölümü veya tamamen açık(ücretsiz) bir bölüm olabilir. Mantığı implementasyon belirlemeli ama sonuç bool'dur.
    /// </summary>
    Task<bool> HasUserUnlockedChapterAsync(Guid userId, Guid chapterId, CancellationToken ct = default);
    Task<(decimal balance, List<Epiknovel.Shared.Core.Interfaces.Management.WalletTransactionDto> recentTransactions)> GetWalletSummaryAsync(Guid userId, int transactionCount = 10, CancellationToken ct = default);
    Task<List<Epiknovel.Shared.Core.Interfaces.Management.UserPurchasedChapterDto>> GetUserUnlockedChaptersAsync(Guid userId, CancellationToken ct = default);
}
