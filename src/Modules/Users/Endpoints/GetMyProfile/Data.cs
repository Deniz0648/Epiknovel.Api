using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Users.Endpoints.GetMyProfile;

public class Response 
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public int FollowersCount { get; set; }
    public int FollowingCount { get; set; }
    public bool EmailConfirmed { get; set; }
    public bool IsAuthor { get; set; }
    public PermissionSnapshot Permissions { get; set; } = new();
}
