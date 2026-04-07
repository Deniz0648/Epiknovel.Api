using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Enums;

namespace Epiknovel.Modules.Compliance.Domain;

public class VerifiedIBAN : IOwnable, IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // UserId ile eşleşir
    public Guid UserId { get; set; }

    [Masked(MaskType.IBAN)]
    public string Iban { get; set; } = string.Empty;

    [Masked(MaskType.Default)]
    public string AccountHolderName { get; set; } = string.Empty;

    [Masked(MaskType.Default)]
    public string SwiftCode { get; set; } = string.Empty;
    
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public Guid? VerifiedByUserId { get; set; }
}
