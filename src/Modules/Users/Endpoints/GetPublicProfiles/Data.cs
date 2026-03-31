namespace Epiknovel.Modules.Users.Endpoints.GetPublicProfiles;

public class Request
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Query { get; set; }
    public bool? IsAuthor { get; set; }
    public string? SortBy { get; set; } = "joinedAt";
    public string? SortDirection { get; set; } = "desc";
}

public class PublicProfileListItem
{
    public string Slug { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsAuthor { get; set; }
    public int BooksCount { get; set; }
    public int FollowersCount { get; set; }
    public int FollowingCount { get; set; }
    public bool IsFollowing { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class Response
{
    public List<PublicProfileListItem> Items { get; set; } = [];
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
}
