using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Enums;

namespace Epiknovel.Modules.Compliance.Domain;

public class TaxExemptionInfo : IOwnable, IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    [Masked(MaskType.Default)]
    public string DocumentNumber { get; set; } = string.Empty;
    public DateTime IssuedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    
    public string DocumentUrl { get; set; } = string.Empty; // Minio URL
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public Guid? VerifiedByUserId { get; set; }
}
