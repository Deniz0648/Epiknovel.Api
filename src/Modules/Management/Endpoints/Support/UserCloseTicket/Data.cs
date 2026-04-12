using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Endpoints.Support.UserCloseTicket;

public class Request : IOwnable
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
