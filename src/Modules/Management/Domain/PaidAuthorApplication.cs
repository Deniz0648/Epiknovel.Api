using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Management.Domain;

public class PaidAuthorApplication : BaseEntity, IOwnable
{
    public Guid UserId { get; set; }
    
    // Belgeler (Local Secure Storage)

    public string GvkExemptionCertificateUrl { get; set; } = string.Empty; // GVK 20/B İstisna Belgesi
    public string BankAccountDocumentUrl { get; set; } = string.Empty; // Banka Hesap Dekontu
    
    public string Iban { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    public string? AdminNote { get; set; }
    
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
}
