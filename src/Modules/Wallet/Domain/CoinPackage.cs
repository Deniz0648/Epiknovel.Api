using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Domain;

public class CoinPackage : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; } // Yerel Para Birimi (Örn: TL)
    public int Amount { get; set; } // Kaç Coin?
    public int BonusAmount { get; set; } // Ekstra Coin?
    
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsBestValue { get; set; }
    public bool IsPopular { get; set; }
    public int DisplayOrder { get; set; }
}
