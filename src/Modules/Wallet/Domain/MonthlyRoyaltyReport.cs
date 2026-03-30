using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Domain;

public class MonthlyRoyaltyReport : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity modülündeki UserId (Author/Translator) ile eşleşir
    public Guid UserId { get; set; }

    // Books modülündeki BookId ile eşleşir
    public Guid BookId { get; set; }

    public int Month { get; set; }
    public int Year { get; set; }

    public decimal TotalCoinsEarned { get; set; }
    public decimal RevenueShareInCurrency { get; set; } // Örn: Yazarın alacağı net para
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }
}
