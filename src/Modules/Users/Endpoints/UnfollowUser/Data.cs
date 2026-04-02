namespace Epiknovel.Modules.Users.Endpoints.UnfollowUser;

public class Request
{
    public string Identifier { get; set; } = string.Empty;
}

public class Response 
{
    public int FollowersCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
