using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Compliance.Domain;

public class VerifiedIBAN : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // UserId ile eşleşir
    public Guid UserId { get; set; }

    public string Iban { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string SwiftCode { get; set; } = string.Empty;
    
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public Guid? VerifiedByUserId { get; set; }
}
