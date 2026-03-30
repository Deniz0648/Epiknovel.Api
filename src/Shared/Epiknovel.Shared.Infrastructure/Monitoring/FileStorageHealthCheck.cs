using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace Epiknovel.Shared.Infrastructure.Monitoring;

/// <summary>
/// Yerel disk depolama alanının (Uploads klasörü) erişilebilirliğini 
/// ve yazma iznini kontrol eden sağlık taraması.
/// </summary>
public class FileStorageHealthCheck(IConfiguration configuration) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try
        {
            var path = configuration["FileStorage:SecurePath"] ?? "C:\\Epiknovel\\Uploads";
            
            // 1. Klasör Var mı?
            if (!Directory.Exists(path))
            {
                // Klasör yoksa oluşturmayı deneyelim (Otomatik iyileştirme denemesi)
                Directory.CreateDirectory(path);
            }

            // 2. Yazma İzni Kontrolü (Geçici dosya oluştur-sil)
            var testFile = Path.Combine(path, $".healthcheck_{Guid.NewGuid()}");
            File.WriteAllText(testFile, "health check");
            File.Delete(testFile);

            return Task.FromResult(HealthCheckResult.Healthy("File storage is accessible and writable."));
        }
        catch (Exception ex)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy($"File storage access failed: {ex.Message}"));
        }
    }
}
