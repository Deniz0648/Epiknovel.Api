using System.ComponentModel.DataAnnotations;

namespace Epiknovel.Shared.Core.Domain;

/// <summary>
/// Sistem genelindeki tüm değişikliklerin (WWWW H) izlendiği merkezi denetim kaydı.
/// </summary>
public class AuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    
    [Required]
    public string Module { get; set; } = string.Empty;
    
    [Required]
    public string Action { get; set; } = string.Empty;
    
    [Required]
    public string EntityName { get; set; } = string.Empty;
    
    public string? PrimaryKeys { get; set; } // JSON formatında ID(ler)
    
    public EntityState State { get; set; } // Added, Modified, Deleted

    public string? OldValues { get; set; } // JSON formatında sadece değişen eski değerler
    
    public string? NewValues { get; set; } // JSON formatında sadece değişen yeni değerler
    
    public string? ChangedColumns { get; set; } // Değişen kolon listesi (JSON string[])
    
    public string? IpAddress { get; set; }
    
    public string? UserAgent { get; set; }
    
    public string? Endpoint { get; set; }
    
    public string? Method { get; set; }
    
    public string? TraceId { get; set; }
}

public enum EntityState
{
    Added = 1,
    Modified = 2,
    Deleted = 3
}
