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
    public PermissionSnapshot Permissions { get; init; } = null!;
}
