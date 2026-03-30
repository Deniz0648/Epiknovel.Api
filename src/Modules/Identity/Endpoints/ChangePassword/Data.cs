namespace Epiknovel.Modules.Identity.Endpoints.ChangePassword;

public class Request
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
