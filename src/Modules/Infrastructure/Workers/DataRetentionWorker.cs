using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Epiknovel.Modules.Infrastructure.Workers;

/// <summary>
/// Veri Saklama ve Bölümleme (Partitioning) Yöneticisi.
/// Her gece çalışır, gelecek ayın tablolarını hazırlar ve eski verileri (12 ay+) temizler/arşivler.
/// </summary>
public class DataRetentionWorker(
    IServiceProvider serviceProvider,
    ILogger<DataRetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("DataRetentionWorker başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<InfrastructureDbContext>();

                // 1. Şemaları ve Bölümleri Hazırla (Örn: Bu ay ve gelecek ay)
                await ManagePartitionsAsync(dbContext, stoppingToken);

                // 2. 24 saat bekle (Her gece yarısı çalışması için)
                var nextRun = DateTime.Today.AddDays(1);
                var delay = nextRun - DateTime.Now;
                await Task.Delay(delay, stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "DataRetentionWorker çalışırken hata oluştu.");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }
    }

    private async Task ManagePartitionsAsync(InfrastructureDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var monthsToPrepare = new[] { now, now.AddMonths(1) };

        foreach (var date in monthsToPrepare)
        {
            var year = date.Year;
            var month = date.Month;

            // 🛡️ UTC Zorunluluğu: Npgsql 6.0+ için tarihlerin Kind=Utc olması şart
            var start = DateTime.SpecifyKind(new DateTime(year, month, 1), DateTimeKind.Utc);
            var end = DateTime.SpecifyKind(start.AddMonths(1), DateTimeKind.Utc);

            // 🗄️ SQL Kısıtlaması: Tablo isimleri parametre (@p0) O-LA-MAZ.
            // Bu yüzden tablo ismini dize olarak önceden hazırlıyoruz.
            var infraPartitionTable = $"Notifications_{year}_{month:D2}";
            var walletPartitionTable = $"WalletTransactions_{year}_{month:D2}";

            // Notifications için Partition oluştur
            await db.Database.ExecuteSqlAsync($"CALL infrastructure.create_notification_partition({year}, {month})", ct);

            // WalletTransactions için Partition oluştur 
            await db.Database.ExecuteSqlAsync($"CALL wallet.create_wallet_partition({year}, {month})", ct);
        }

        logger.LogInformation("Partitioning bakımı tamamlandı.");
    }
}
