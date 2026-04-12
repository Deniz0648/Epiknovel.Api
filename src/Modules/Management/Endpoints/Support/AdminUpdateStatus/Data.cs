using Epiknovel.Modules.Management.Domain;

namespace Epiknovel.Modules.Management.Endpoints.Support.AdminUpdateStatus;

public class Request
{
    public Guid Id { get; set; }
    public TicketStatus Status { get; set; }
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
