namespace Epiknovel.Modules.Identity.Endpoints.RefreshToken;

public class Request
{
    public string RefreshToken { get; set; } = string.Empty;
}

public class Response : Login.Response 
{
    // Login response ile aynı yapıyı paylaşır: AccessToken, RefreshToken, ExpiryDate
}
