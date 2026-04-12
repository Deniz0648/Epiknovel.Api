namespace Epiknovel.Shared.Core.Models;

public record MyProfileResponse
{
    public Guid UserId { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public string? Bio { get; init; }
    public int FollowersCount { get; init; }
    public int FollowingCount { get; init; }
    public bool EmailConfirmed { get; init; }
    public bool IsAuthor { get; init; }
    public decimal TokenBalance { get; init; }
    public PermissionSnapshot Permissions { get; init; } = null!;
    public AddressDto? BillingAddress { get; init; }
}

public record AddressDto
{
    public string FullName { get; init; } = string.Empty;
    public string Country { get; init; } = "Turkey";
    public string City { get; init; } = string.Empty;
    public string District { get; init; } = string.Empty;
    public string AddressLine { get; init; } = string.Empty;
    public string ZipCode { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string? TaxNumber { get; init; }
    public string? TaxOffice { get; init; }
    public string? IdentityNumber { get; init; }
}
