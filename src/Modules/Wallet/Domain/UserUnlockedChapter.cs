using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Domain;

public class UserUnlockedChapter : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    // Books modülündeki BookId ve ChapterId ile eşleşir
    public Guid BookId { get; set; }
    public Guid ChapterId { get; set; }

    public int PricePaid { get; set; } // Örn: 10 Coin
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;

    // Revenue Tracking: Kime kazanç gitti? (Logical Mapping)
    public Guid RevenueOwnerId { get; set; } // Yazar veya Çevirmen Id
}
