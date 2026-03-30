namespace Epiknovel.Modules.Identity.Endpoints.ConfirmChangeEmail;

public class Request
{
    public string NewEmail { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
