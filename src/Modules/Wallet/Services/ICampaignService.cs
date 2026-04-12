using Epiknovel.Modules.Wallet.Domain;

namespace Epiknovel.Modules.Wallet.Services;

public interface ICampaignService
{
    /// <summary>
    /// Bir bölüm için aktif kampanyayı hiyerarşik olarak bulur ve hesaplanmış fiyatları döner.
    /// Hierarchy: Book > Category > Global
    /// </summary>
    Task<CampaignResult> GetDiscountedPriceAsync(Guid chapterId, int originalPrice, CancellationToken ct = default);
}
