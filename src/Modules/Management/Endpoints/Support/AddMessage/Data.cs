using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Endpoints.Support.AddMessage;

public class Request : IOwnable
{
    public Guid UserId { get; set; }
    public Guid TicketId { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class Response 
{
    public Guid Id { get; set; }
    public string Message { get; set; } = string.Empty;
}
