using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Identity.Endpoints.Login;

public class Request
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class Response
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public MyProfileResponse Profile { get; set; } = null!;
}
