using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Domain;

public enum AddressType
{
    Billing,
    Shipping
}

public class UserAddress : BaseEntity, ISoftDelete, IOwnable
{
    public Guid UserId { get; set; }
    
    public AddressType Type { get; set; } = AddressType.Billing;
    public string FullName { get; set; } = string.Empty;
    public string Country { get; set; } = "Turkey";
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    [Encrypted]
    public string AddressLine { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    [Encrypted]
    public string PhoneNumber { get; set; } = string.Empty;
    [Encrypted]
    public string? TaxNumber { get; set; }
    [Encrypted]
    public string? TaxOffice { get; set; }
    [Encrypted]
    public string? IdentityNumber { get; set; }

}
