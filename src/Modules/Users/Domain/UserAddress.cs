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
    public string AddressLine { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? TaxNumber { get; set; }
    public string? TaxOffice { get; set; }

    // ISoftDelete Implementation (BaseEntity.IsDeleted kullanılıyor)
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
