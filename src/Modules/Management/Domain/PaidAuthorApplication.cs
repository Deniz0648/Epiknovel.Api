using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Management.Domain;

public class PaidAuthorApplication : BaseEntity, IOwnable
{
    public Guid UserId { get; set; }
    
    // Belgeler (Local Secure Storage)

    public Guid GvkExemptionCertificateId { get; set; } // GVK 20/B İstisna Belgesi (Compliance.SecureDocument)
    public Guid BankAccountDocumentId { get; set; } // Banka Hesap Dekontu (Compliance.SecureDocument)
    
    public string Iban { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    public string? AdminNote { get; set; }
    
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
}
