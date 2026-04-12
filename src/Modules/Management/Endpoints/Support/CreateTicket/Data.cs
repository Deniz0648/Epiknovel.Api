using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Management.Domain;

namespace Epiknovel.Modules.Management.Endpoints.Support.CreateTicket;

public class Request : IOwnable
{
    public Guid UserId { get; set; } // Populated from token
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}

public class Response 
{
    public Guid Id { get; set; }
    public string Message { get; set; } = string.Empty;
}
