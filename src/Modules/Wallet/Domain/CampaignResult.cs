namespace Epiknovel.Modules.Wallet.Domain;

public record CampaignResult(
    int DiscountedPrice,
    int CompensationBasePrice,
    CampaignSponsorType SponsorType,
    bool IsActive,
    int DiscountPercentage
);
