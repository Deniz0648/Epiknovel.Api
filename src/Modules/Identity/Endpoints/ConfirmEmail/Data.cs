namespace Epiknovel.Modules.Identity.Endpoints.ConfirmEmail;

public class Request
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
}
