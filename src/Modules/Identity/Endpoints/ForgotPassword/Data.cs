namespace Epiknovel.Modules.Identity.Endpoints.ForgotPassword;

public class Request
{
    public string Email { get; set; } = string.Empty;
}

public class Response
{
    public string Message { get; set; } = string.Empty;
}
