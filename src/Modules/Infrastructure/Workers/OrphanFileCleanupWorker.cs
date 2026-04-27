using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Epiknovel.Shared.Core.Interfaces;
using System.IO;

namespace Epiknovel.Modules.Infrastructure.Workers;

/// <summary>
/// Veritabanında karşılığı olmayan "sahipsiz" dosyaları (orphan files) 
/// disk üzerinden temizleyen arka plan servisi.
/// </summary>
public class OrphanFileCleanupWorker(
    IServiceScopeFactory serviceScopeFactory,
    ILogger<OrphanFileCleanupWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("OrphanFileCleanupWorker başlatıldı. (Günde 1 kez çalışır)");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Gece yarısı civarında çalışması için bekle (İlk çalışma hemen değil, 24 saat sonra)
                // Test için ilk çalışmayı da yapabiliriz ama prod'da sessiz kalmalı.
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);

                using var scope = serviceScopeFactory.CreateScope();
                var providers = scope.ServiceProvider.GetServices<IFileUsageProvider>();
                var fileService = scope.ServiceProvider.GetRequiredService<IFileService>();

                logger.LogInformation("Dosya temizliği başlatılıyor...");

                // 1. Modüllerden kullanılan tüm dosya adlarını topla
                var usedFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var provider in providers)
                {
                    var files = await provider.GetUsedFilesAsync();
                    foreach (var f in files)
                    {
                        if (!string.IsNullOrEmpty(f))
                        {
                            // Path/URL içerisinden sadece dosya adını al (Örn: /uploads/covers/abc.webp -> abc.webp)
                            var fileName = Path.GetFileName(f);
                            usedFiles.Add(fileName);
                        }
                    }
                }

                // 2. Fiziksel dosyaları tara
                var physicalFiles = await fileService.GetAllPhysicalFilesAsync();

                // 3. Eşleşmeyenleri bul ve sil (Grace period: 24 saat)
                int deletedCount = 0;
                foreach (var filePath in physicalFiles)
                {
                    var fileName = Path.GetFileName(filePath);
                    if (!usedFiles.Contains(fileName))
                    {
                        // HENÜZ yüklenmiş ama henüz veritabanına kaydedilmemiş olabilir (Transaction devam ediyor veya form açık)
                        // Bu yüzden 24 saatten eski dosyaları siliyoruz.
                        var creationTime = File.GetCreationTime(filePath);
                        if (DateTime.Now - creationTime > TimeSpan.FromHours(24))
                        {
                            File.Delete(filePath);
                            deletedCount++;
                        }
                    }
                }

                if (deletedCount > 0)
                    logger.LogInformation("{Count} adet sahipsiz dosya temizlendi.", deletedCount);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "OrphanFileCleanupWorker çalışırken bir hata oluştu.");
            }
        }
    }
}
