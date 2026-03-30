namespace Epiknovel.Modules.Identity.Endpoints.ResetPassword;

public class Request
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class Response
{
    public string Message { get; set; } = string.Empty;
}
