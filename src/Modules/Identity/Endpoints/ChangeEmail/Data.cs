namespace Epiknovel.Modules.Identity.Endpoints.ChangeEmail;

public class Request
{
    public string NewEmail { get; set; } = string.Empty;
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
