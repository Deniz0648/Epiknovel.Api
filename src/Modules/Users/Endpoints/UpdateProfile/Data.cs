using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Endpoints.UpdateProfile;

public class Request : IOwnable
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Bio { get; set; }
}

public class Response
{
    public string Message { get; set; } = string.Empty;
}
