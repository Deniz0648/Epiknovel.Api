using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Domain;

public class CoinPackage : BaseEntity, ISoftDelete
{
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; } // Yerel Para Birimi (Örn: TL)
    public int Amount { get; set; } // Kaç Coin?
    public int BonusAmount { get; set; } // Ekstra Coin?
    
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }

    // ISoftDelete Implementation
    public new bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
