using Microsoft.AspNetCore.Http;
using FastEndpoints;

namespace Epiknovel.Shared.Infrastructure.Endpoints.MediaUpload;

public class Request
{
    public IFormFile File { get; set; } = null!;
    
    /// <summary>
    /// S3 Bucket/Klasör adı (örn: covers, profiles, chapters)
    /// </summary>
    public string Category { get; set; } = "general";

    /// <summary>
    /// Ölçeklendirme (Genişlik) - 0 ise orijinal boyut korunur.
    /// </summary>
    public int? Width { get; set; }

    /// <summary>
    /// Ölçeklendirme (Yükseklik) - 0 ise orijinal boyut korunur.
    /// </summary>
    public int? Height { get; set; }
}

public class Response 
{
    public string Url { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
}
