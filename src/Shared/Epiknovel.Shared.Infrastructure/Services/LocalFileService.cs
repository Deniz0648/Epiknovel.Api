using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Epiknovel.Shared.Core.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;
using Microsoft.AspNetCore.Hosting;
using Epiknovel.Shared.Infrastructure.Background;

namespace Epiknovel.Shared.Infrastructure.Services;

public class LocalFileService : IFileService
{
    private readonly string _webRootPath;
    private readonly string _secureRootPath;
    private readonly string _baseUrl;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IImageProcessingQueue _imageQueue;

    public LocalFileService(
        IWebHostEnvironment env, 
        IConfiguration config, 
        IHttpContextAccessor httpContextAccessor, 
        IImageProcessingQueue imageQueue)
    {
        _webRootPath = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        _secureRootPath = config["FileStorage:SecurePath"] ?? "/app/SecureDocs";
        _baseUrl = config["FileStorage:BaseUrl"] ?? string.Empty;
        _httpContextAccessor = httpContextAccessor;
        _imageQueue = imageQueue;

        if (!Directory.Exists(_secureRootPath)) Directory.CreateDirectory(_secureRootPath);
        var publicUploadsPath = Path.Combine(_webRootPath, "uploads");
        if (!Directory.Exists(publicUploadsPath)) Directory.CreateDirectory(publicUploadsPath);
    }

    private static readonly Dictionary<string, (int Width, int Height, ResizeMode Mode)> _imagePolicies = new()
    {
        { "covers", (600, 900, ResizeMode.Crop) },    // Kitap Kapakları (2:3 Standart)
        { "avatars", (300, 300, ResizeMode.Pad) },    // Kullanıcı Avatarları (1:1 Standart)
        { "chapters", (1200, 0, ResizeMode.Max) },   // Bölüm İçi Görseller (Max Genişlik, Oransal)
        { "comments", (800, 0, ResizeMode.Max) },    // Yorum Görselleri (Sıkıştırılmış)
        { "icons", (128, 128, ResizeMode.Crop) }     // Kategoriler vb. için ikonlar (1:1 Kare, WebP)
    };

    public async Task<string> SaveImageAsync(IFormFile file, string category, int width = 0, int height = 0)
    {
        // 1. Güvenlik Kontrolü (MIME/Magic Number)
        if (!await ValidateFileSignature(file))
            throw new InvalidOperationException("Geçersiz dosya içeriği.");

        // 2. Yol Hazırlığı
        var uploadDir = Path.Combine(_webRootPath, "uploads", category);
        var tempDir = Path.Combine(_webRootPath, "uploads", "temp");
        if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);
        if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);

        var id = Guid.NewGuid().ToString("N");
        var fileName = $"{id}.webp";
        var tempFileName = $"{id}.tmp";
        
        var tempPath = Path.Combine(tempDir, tempFileName);
        var targetPath = Path.Combine(uploadDir, fileName);

        // 3. Dosyayı Ham Haliyle Geçici Olarak Kaydet (Çok Hızlı)
        using (var outputStream = new FileStream(tempPath, FileMode.Create))
        {
            await file.CopyToAsync(outputStream);
        }

        // 4. Arka Plan İşleme Kuyruğuna At (CPU Yükünü Request Thread'den temizle)
        var mode = ResizeMode.Max;
        if (width == 0 && height == 0 && _imagePolicies.TryGetValue(category, out var policy))
        {
            width = policy.Width;
            height = policy.Height;
            mode = policy.Mode;
        }

        await _imageQueue.EnqueueAsync(new ImageProcessingTask(tempPath, targetPath, width, height, mode));

        // 🚀 İşlem bitmeden ismini dönebiliriz, bir saniye içinde WebP hazır olacaktır.
        return fileName;
    }

    public async Task<string> SaveSecureDocumentAsync(IFormFile file, string category)
    {
        // 1. Güvenlik Kontrolü (MIME/Magic Number)
        if (!await ValidateFileSignature(file))
            throw new InvalidOperationException("Geçersiz dosya içeriği.");

        // 2. Yol Hazırlığı (Private: SecurePath/category)
        var uploadDir = Path.Combine(_secureRootPath, category);
        if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);

        // 3. Güvenli İsimlendirme (GUID + Orijinal Uzantı) - Path Traversal Koruması
        var extension = Path.GetExtension(file.FileName).ToLower();
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(uploadDir, fileName);

        // 4. Doğrudan Kaydet (Binary Copy)
        using (var inputStream = file.OpenReadStream())
        using (var outputStream = new FileStream(fullPath, FileMode.Create))
        {
            await inputStream.CopyToAsync(outputStream);
        }

        return fileName;
    }

    public async Task<Stream> GetSecureFileStreamAsync(string fileName, string category)
    {
        var fullPath = Path.Combine(_secureRootPath, category, fileName);
        
        if (!File.Exists(fullPath))
            throw new FileNotFoundException("İstenen doküman bulunamadı.");

        // Stream'i FileStream olarak dön (Caller kapatmalı)
        return new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    public async Task DeleteFileAsync(string fileName, string category)
    {
        // Hem public hem private alanları kontrol et ve sil
        var publicPath = Path.Combine(_webRootPath, "uploads", category, fileName);
        var privatePath = Path.Combine(_secureRootPath, category, fileName);

        if (File.Exists(publicPath)) File.Delete(publicPath);
        if (File.Exists(privatePath)) File.Delete(privatePath);
    }

    public string GetFileUrl(string fileName, string category)
    {
        return $"/uploads/{category.ToLower()}/{fileName}";
    }

    private static readonly Dictionary<string, byte[]> _fileSignatures = new()
    {
        { ".jpg", new byte[] { 0xFF, 0xD8, 0xFF } },
        { ".jpeg", new byte[] { 0xFF, 0xD8, 0xFF } },
        { ".png", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } },
        { ".webp", new byte[] { 0x52, 0x49, 0x46, 0x46 } },
        { ".pdf", new byte[] { 0x25, 0x50, 0x44, 0x46 } }
    };

    public async Task<IEnumerable<string>> GetAllPhysicalFilesAsync()
    {
        var publicUploads = Path.Combine(_webRootPath, "uploads");
        var allFiles = new List<string>();

        // Public dosyaları tara
        if (Directory.Exists(publicUploads))
        {
            allFiles.AddRange(Directory.GetFiles(publicUploads, "*.*", SearchOption.AllDirectories));
        }

        // Private dosyaları tara
        if (Directory.Exists(_secureRootPath))
        {
            allFiles.AddRange(Directory.GetFiles(_secureRootPath, "*.*", SearchOption.AllDirectories));
        }

        return await Task.FromResult(allFiles.Distinct());
    }

    private async Task<bool> ValidateFileSignature(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLower();
        if (!_fileSignatures.TryGetValue(ext, out var signature)) return false;

        using (var reader = new BinaryReader(file.OpenReadStream()))
        {
            var headerBytes = reader.ReadBytes(signature.Length);
            return headerBytes.SequenceEqual(signature);
        }
    }
}
