using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Wallet.Domain;

public class SpendingCampaign : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public CampaignTargetType TargetType { get; set; }
    public Guid? TargetId { get; set; } // BookId or CategoryId, null if Global
    public int DiscountPercentage { get; set; } // 1-99
    public CampaignSponsorType SponsorType { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;

    // Helper to check if campaign is currently valid
    public bool IsCurrentlyActive() => IsActive && StartDate <= DateTime.UtcNow && EndDate >= DateTime.UtcNow;
}
