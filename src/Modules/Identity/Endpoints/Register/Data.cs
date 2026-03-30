namespace Epiknovel.Modules.Identity.Endpoints.Register;

public class Request
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class Response
{
    public string Message { get; set; } = string.Empty;
}
