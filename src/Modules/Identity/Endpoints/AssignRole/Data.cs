namespace Epiknovel.Modules.Identity.Endpoints.AssignRole;

public class Request
{
    public Guid UserId { get; set; }
    public string RoleName { get; set; } = string.Empty;
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
