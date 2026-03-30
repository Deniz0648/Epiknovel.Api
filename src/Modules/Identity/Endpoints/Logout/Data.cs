namespace Epiknovel.Modules.Identity.Endpoints.Logout;

public class Request
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
