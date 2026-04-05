using Epiknovel.Shared.Core.Domain;
using System.ComponentModel.DataAnnotations;

namespace Epiknovel.Modules.Books.Domain;

/// <summary>
/// Silinen veya değişen kritik verilerin asenkron olarak saklandığı "Cold Storage" tablosu.
/// Disaster Recovery ve Yanlışlıkla Silme durumları için hayat kurtarıcıdır.
/// </summary>
public class AuditArchive : BaseEntity
{
    [Required]
    public string EntityType { get; set; } = string.Empty; // "Book", "Chapter"
    
    [Required]
    public Guid EntityId { get; set; }
    
    [Required]
    public string DataJson { get; set; } = string.Empty; // Verinin o anki JSON hali
    
    public Guid PerformedByUserId { get; set; }
    
    public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;
}
