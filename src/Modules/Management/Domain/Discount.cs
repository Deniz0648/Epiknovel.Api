using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Domain;

public enum DiscountType
{
    Percentage,
    FixedAmount
}

public class Discount : BaseEntity, ISoftDelete
{
    public string Code { get; set; } = string.Empty; // Kupon Kodu
    public DiscountType Type { get; set; }
    public decimal Value { get; set; } // %20 veya 50 Coin indirim
    
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; } = true;

    // ISoftDelete Implementation
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
