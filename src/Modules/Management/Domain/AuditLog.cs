using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Domain;

public class AuditLog : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // İşlemi yapan UserId (Identity modülü ile eşleşir)
    public Guid UserId { get; set; }
    
    public string Module { get; set; } = string.Empty; // Örn: Books, Wallet
    public string Action { get; set; } = string.Empty; // Örn: UpdatePrice, DeleteChapter
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    
    public string? OldValues { get; set; } // JSON formatında
    public string? NewValues { get; set; } // JSON formatında
    
    public string IpAddress { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public string? Country { get; set; } 
    
    public string Endpoint { get; set; } = string.Empty; // Örn: /identity/login
    public string Method { get; set; } = string.Empty;   // Örn: POST
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
