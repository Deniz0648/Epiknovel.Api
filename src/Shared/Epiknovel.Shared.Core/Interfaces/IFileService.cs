using Microsoft.AspNetCore.Http;

namespace Epiknovel.Shared.Core.Interfaces;

public interface IFileService
{
    /// <summary>
    /// Bir görseli işleyip, WebP'ye dönüştürerek kalıcı olarak kaydeder.
    /// </summary>
    /// <param name="file">Yüklenen ham dosya (JPG, PNG vb.)</param>
    /// <param name="category">Kaydedilecek klasör (Örn: profiles, covers)</param>
    /// <param name="width">Opsiyonel genişlik (WebP dönüşümü sırasında kullanılır)</param>
    /// <param name="height">Opsiyonel yükseklik (WebP dönüşümü sırasında kullanılır)</param>
    /// <returns>Üretilen GUID bazlı WebP dosya adını (Örn: a8f7...webp)</returns>
    Task<string> SaveImageAsync(IFormFile file, string category, int width = 0, int height = 0);

    /// <summary>
    /// Resmi belgeleri (KYC, PDF vb.) orijinal formatıyla ve private ACL ile kaydeder.
    /// Herhangi bir görsel işleme (resize) uygulanmaz.
    /// </summary>
    /// <param name="file">Yüklenen dosya</param>
    /// <param name="category">Yerel Klasör/Kategori adı</param>
    /// <returns>Yerel diskte saklanan güvenli dosya adı</returns>

    Task<string> SaveSecureDocumentAsync(IFormFile file, string category);

    /// <summary>
    /// Gizli (Private) dosyayı diskten okuyup stream olarak döner.
    /// BOLA kontrolü endpoint seviyesinde yapılmalıdır.
    /// </summary>
    /// <param name="fileName">Sistemdeki dosya adı</param>
    /// <param name="category">Dosya kategorisi (klasör)</param>
    /// <returns>Dosya stream içeriği</returns>
    Task<Stream> GetSecureFileStreamAsync(string fileName, string category);

    /// <summary>
    /// Belirtilen dosyayı sunucudaki fiziksel depolamasından siler.
    /// </summary>
    /// <param name="fileName">Silinecek dosya adı</param>
    /// <param name="category">Hangi klasörde olduğu</param>
    Task DeleteFileAsync(string fileName, string category);

    /// <summary>
    /// Bir dosya adı için dışarıdan erişilebilir tam URL'i üretir (Public dosyalar için).
    /// </summary>
    /// <param name="fileName">Kayıtlı dosya adı</param>
    /// <param name="category">Hali hazırda bulunduğu klasör</param>
    string GetFileUrl(string fileName, string category);

    /// <summary>
    /// Sunucudaki disk üzerinde kayıtlı olan tüm fiziksel dosya adlarını (Full Path olmadan) döner.
    /// Orphan file cleanup worker tarafından kullanılır.
    /// </summary>
    Task<IEnumerable<string>> GetAllPhysicalFilesAsync();
}
