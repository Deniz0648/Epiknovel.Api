using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Management.Domain;

namespace Epiknovel.Modules.Management.Endpoints.Support.GetMyTickets;

public class Request : IOwnable
{
    public Guid UserId { get; set; }
}

public class TicketItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastRespondedAt { get; set; }
}

public class Response 
{
    public List<TicketItem> Tickets { get; set; } = new();
}
