using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Domain;

public enum DiscountScope
{
    Global,
    Category,
    Book
}

public enum DiscountType
{
    Percentage,
    FixedAmount
}

public class Discount : BaseEntity, ISoftDelete
{
    public string? Code { get; set; } // Kupon Kodu (Optional)
    public DiscountScope Scope { get; set; } = DiscountScope.Global;
    public Guid? TargetId { get; set; } // CategoryId or BookId
    public DiscountType Type { get; set; }
    public decimal Value { get; set; } // %20 veya 50 Coin indirim
    
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; } = true;
}
