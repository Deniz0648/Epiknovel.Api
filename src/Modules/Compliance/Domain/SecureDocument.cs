using System.ComponentModel.DataAnnotations;

namespace Epiknovel.Modules.Compliance.Domain;

/// <summary>
/// Güvenli doküman (Kimlik, Vergi Belgesi vb.) metadata bilgileri.
/// </summary>
public class SecureDocument
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; } // Dosya kime ait? (BOLA için kritik)

    [Required, MaxLength(255)]
    public string OriginalFileName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string StoredFileName { get; set; } = string.Empty; // S3 Key

    [Required, MaxLength(50)]
    public string Category { get; set; } = "documents"; // Bucket/Klasör

    [MaxLength(100)]
    public string MimeType { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
