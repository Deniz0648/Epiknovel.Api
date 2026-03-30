using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Epiknovel.Shared.Core.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;
using Microsoft.AspNetCore.Hosting;

namespace Epiknovel.Shared.Infrastructure.Services;

public class LocalFileService : IFileService
{
    private readonly string _webRootPath;
    private readonly string _secureRootPath;
    private readonly string _baseUrl;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public LocalFileService(IWebHostEnvironment env, IConfiguration config, IHttpContextAccessor httpContextAccessor)
    {
        _webRootPath = env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        _secureRootPath = config["FileStorage:SecurePath"] ?? @"C:\Epiknovel\SecureDocs";
        _baseUrl = config["FileStorage:BaseUrl"] ?? string.Empty;
        _httpContextAccessor = httpContextAccessor;

        if (!Directory.Exists(_secureRootPath)) Directory.CreateDirectory(_secureRootPath);
        var publicUploadsPath = Path.Combine(_webRootPath, "uploads");
        if (!Directory.Exists(publicUploadsPath)) Directory.CreateDirectory(publicUploadsPath);
    }

    private static readonly Dictionary<string, (int Width, int Height, ResizeMode Mode)> _imagePolicies = new()
    {
        { "covers", (600, 900, ResizeMode.Crop) },    // Kitap Kapakları (2:3 Standart)
        { "avatars", (300, 300, ResizeMode.Pad) },    // Kullanıcı Avatarları (1:1 Standart)
        { "chapters", (1200, 0, ResizeMode.Max) },   // Bölüm İçi Görseller (Max Genişlik, Oransal)
        { "comments", (800, 0, ResizeMode.Max) }     // Yorum Görselleri (Sıkıştırılmış)
    };

    public async Task<string> SaveImageAsync(IFormFile file, string category, int width = 0, int height = 0)
    {
        // 1. Güvenlik Kontrolü (MIME/Magic Number)
        if (!await ValidateFileSignature(file))
            throw new InvalidOperationException("Geçersiz dosya içeriği.");

        // 2. Yol Hazırlığı (Public: wwwroot/uploads/category)
        var uploadDir = Path.Combine(_webRootPath, "uploads", category);
        if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);

        // 3. Güvenli İsimlendirme (GUID.webp) - Path Traversal Koruması
        var fileName = $"{Guid.NewGuid():N}.webp";
        var fullPath = Path.Combine(uploadDir, fileName);

        // 4. Görsel İşleme (ImageSharp Policy Check)
        using (var inputStream = file.OpenReadStream())
        using (var image = await Image.LoadAsync(inputStream))
        {
            // Eğer özel width/height verilmemişse politikadan al
            if (width == 0 && height == 0 && _imagePolicies.TryGetValue(category, out var policy))
            {
                width = policy.Width;
                height = policy.Height;

                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(width, height),
                    Mode = policy.Mode // Crop, Pad veya Max
                }));
            }
            else if (width > 0 || height > 0)
            {
                // Manuel boyutlandırma isteği (Eski usul fallback)
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(width, height),
                    Mode = ResizeMode.Max
                }));
            }

            // 5. WebP Dönüşümü ve Performans Sıkıştırması
            // Kaliteyi %80 yaparak hem yüksek hız hem de iyi görsel kalite elde ediyoruz.
            var encoder = new WebpEncoder { Quality = 80 };
            await image.SaveAsync(fullPath, encoder);
        }

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
        var baseUrl = _baseUrl;

        // Otomatik Optimizasyon: Eğer config boşsa, isteğin geldiği domaini otomatik algıla
        if (string.IsNullOrEmpty(baseUrl) && _httpContextAccessor.HttpContext != null)
        {
            var request = _httpContextAccessor.HttpContext.Request;
            baseUrl = $"{request.Scheme}://{request.Host}";
        }

        // Fallback (Her şey başarısız olursa)
        if (string.IsNullOrEmpty(baseUrl)) baseUrl = "http://localhost:5000";

        return $"{baseUrl.TrimEnd('/')}/uploads/{category}/{fileName}";
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
