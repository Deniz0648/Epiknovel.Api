namespace Epiknovel.Modules.Identity.Endpoints.RevokeSession;

public class Request
{
    public Guid SessionId { get; set; }
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
