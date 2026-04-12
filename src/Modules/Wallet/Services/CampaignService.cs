using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Interfaces.Books;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Wallet.Services;

public class CampaignService(WalletDbContext dbContext, IBookProvider bookProvider) : ICampaignService
{
    public async Task<CampaignResult> GetDiscountedPriceAsync(Guid chapterId, int originalPrice, CancellationToken ct = default)
    {
        if (originalPrice <= 0)
        {
            return new CampaignResult(0, 0, CampaignSponsorType.Platform, false, 0);
        }

        // 1. Get Metadata
        var bookId = await bookProvider.GetBookIdByChapterIdAsync(chapterId, ct);
        var categoryIds = await bookProvider.GetCategoryIdsByBookIdAsync(bookId, ct);

        var now = DateTime.UtcNow;

        // 2. Resolve Campaign Hierarchy: Book > Category > Global
        SpendingCampaign? campaign = null;

        // Level 1: Book
        campaign = await dbContext.SpendingCampaigns
            .AsNoTracking()
            .Where(x => x.IsActive && x.StartDate <= now && x.EndDate >= now)
            .Where(x => x.TargetType == CampaignTargetType.Book && x.TargetId == bookId)
            .OrderByDescending(x => x.DiscountPercentage)
            .FirstOrDefaultAsync(ct);

        // Level 2: Category
        if (campaign == null && categoryIds.Count > 0)
        {
            campaign = await dbContext.SpendingCampaigns
                .AsNoTracking()
                .Where(x => x.IsActive && x.StartDate <= now && x.EndDate >= now)
                .Where(x => x.TargetType == CampaignTargetType.Category && categoryIds.Contains(x.TargetId ?? Guid.Empty))
                .OrderByDescending(x => x.DiscountPercentage)
                .FirstOrDefaultAsync(ct);
        }

        // Level 3: Global
        if (campaign == null)
        {
            campaign = await dbContext.SpendingCampaigns
                .AsNoTracking()
                .Where(x => x.IsActive && x.StartDate <= now && x.EndDate >= now)
                .Where(x => x.TargetType == CampaignTargetType.Global)
                .OrderByDescending(x => x.DiscountPercentage)
                .FirstOrDefaultAsync(ct);
        }

        if (campaign == null)
        {
            return new CampaignResult(originalPrice, originalPrice, CampaignSponsorType.Platform, false, 0);
        }

        // 3. Calculate Prices
        double reduction = (double)campaign.DiscountPercentage / 100.0;
        int discountedPrice = (int)Math.Max(1, Math.Floor(originalPrice * (1.0 - reduction)));
        
        int compensationBasePrice = campaign.SponsorType == CampaignSponsorType.Platform 
            ? originalPrice 
            : discountedPrice;

        return new CampaignResult(
            discountedPrice, 
            compensationBasePrice, 
            campaign.SponsorType, 
            true, 
            campaign.DiscountPercentage
        );
    }
}
