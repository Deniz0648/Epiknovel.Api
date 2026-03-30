namespace Epiknovel.Modules.Users.Endpoints.FollowUser;

public class Request
{
    public Guid FollowingId { get; set; }
}

public class Response 
{
    public int FollowersCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
