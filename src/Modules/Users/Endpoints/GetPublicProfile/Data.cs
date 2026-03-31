namespace Epiknovel.Modules.Users.Endpoints.GetPublicProfile;

public class Request
{
    public string Slug { get; set; } = string.Empty;
}

public class Response 
{
    public string Slug { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public int FollowersCount { get; set; }
    public int FollowingCount { get; set; }
    public bool IsFollowing { get; set; }
    public bool IsAuthor { get; set; }
    public bool IsRedirected { get; set; }
}
