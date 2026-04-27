using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;

namespace Epiknovel.Modules.Wallet.Background;

public class PopularityCalculatorWorker(
    IServiceProvider serviceProvider,
    ILogger<PopularityCalculatorWorker> logger) : BackgroundService
{
    private readonly TimeSpan _period = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Popularity Calculator Worker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CalculatePopularityAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred during popularity calculation.");
            }

            // İlk çalışmadan sonra bekle
            await Task.Delay(_period, stoppingToken);
        }
    }

    private async Task CalculatePopularityAsync(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<WalletDbContext>();

        logger.LogInformation("Calculating package popularity based on sales...");

        // 1. Son 30 gündeki ödenmiş siparişleri paketlere göre gruplayıp en çok satılan ilk 2'yi bul
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        
        var topPackageIds = await dbContext.CoinPurchaseOrders
            .Where(o => o.Status == OrderStatus.Paid && o.PaidAt >= thirtyDaysAgo)
            .GroupBy(o => o.CoinPackageId)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Key)
            .Take(2)
            .Select(g => g.Key)
            .ToListAsync(ct);

        if (topPackageIds.Count == 0)
        {
            logger.LogWarning("No sales found in the last 30 days to calculate popularity. Checking all time...");
            
            topPackageIds = await dbContext.CoinPurchaseOrders
                .Where(o => o.Status == OrderStatus.Paid)
                .GroupBy(o => o.CoinPackageId)
                .OrderByDescending(g => g.Count())
                .Take(2)
                .Select(g => g.Key)
                .ToListAsync(ct);
        }

        // 2. Tüm paketlerin IsPopular bayrağını güncelle
        var packages = await dbContext.CoinPackages.ToListAsync(ct);
        bool hasChanges = false;

        foreach (var pkg in packages)
        {
            bool shouldBePopular = topPackageIds.Contains(pkg.Id);
            if (pkg.IsPopular != shouldBePopular)
            {
                pkg.IsPopular = shouldBePopular;
                hasChanges = true;
            }
        }

        if (hasChanges)
        {
            await dbContext.SaveChangesAsync(ct);
            logger.LogInformation("Popularity updated successfully for packages.");
        }
        else
        {
            logger.LogInformation("No changes in popularity detected.");
        }
    }
}
