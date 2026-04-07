using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Domain;

public enum TransactionType
{
    Purchase, // Coin Alımı
    Unlock, // Bölüm Kilidi Açma
    Revenue, // Yazara/Çevirmene Kazanç
    Withdrawal, // Ödeme Çekme
    Adjustment // Manuel Düzeltme
}

public class WalletTransaction : IOwnable, IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid WalletId { get; set; }
    public virtual Wallet Wallet { get; set; } = null!;

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    public decimal CoinAmount { get; set; } // Olayın Coin miktarı (-10, +100 vs)
    public decimal? FiatAmount { get; set; } // İşlemin hesaplanmış Net TL karşılığı (Örn: Yazar kazancı)
    public TransactionType Type { get; set; }
    
    // Geçmişin Korunması İçin (Snapshot Yüzdeleri ve Kuru)
    public decimal? AppliedAuthorShare { get; set; } // Örn: %50 = 0.50m
    public decimal? AppliedCoinPrice { get; set; }   // 1 Coin = 0.15m TL

    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Harici referanslar (Opsiyonel)
    public Guid? ReferenceId { get; set; } // Örn: ChapterId veya PayoutRequestId
}
