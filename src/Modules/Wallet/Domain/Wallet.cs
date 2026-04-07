using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Domain;

public class Wallet : IOwnable, IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    public decimal CoinBalance { get; set; } // Okuma için harcanan bakiye
    public decimal RevenueBalance { get; set; } // Yazarların (ve çevirmenlerin) kazancı
    
    // Concurrency (Eşzamanlılık) Kontrolü
    public uint Version { get; set; }

    public virtual ICollection<WalletTransaction> Transactions { get; set; } = new List<WalletTransaction>();
}
