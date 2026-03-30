using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Compliance.Domain;

public enum AgreementType
{
    TermsOfService,
    PrivacyPolicy,
    AuthorAgreement,
    CoAuthorAgreement
}

public class UserAgreement : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    public AgreementType Type { get; set; }
    public string Version { get; set; } = "1.0";
    
    public DateTime AcceptedAt { get; set; } = DateTime.UtcNow;
    public string IpAddress { get; set; } = string.Empty;
}
