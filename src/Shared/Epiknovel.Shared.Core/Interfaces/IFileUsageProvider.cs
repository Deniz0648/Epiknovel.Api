namespace Epiknovel.Shared.Core.Interfaces;

/// <summary>
/// Her modülün kendi kullandığı dosyaları arka plan temizleyicisine (CleanupWorker) 
/// bildirmek için uygulayacağı arayüz. Modüler Monolit bağımlılıklarını izole eder.
/// </summary>
public interface IFileUsageProvider
{
    /// <summary>
    /// Modül tarafından aktif olarak kullanılan (veritabanında kayıtlı) tüm dosya adlarını döner.
    /// </summary>
    Task<IEnumerable<string>> GetUsedFilesAsync();
}
