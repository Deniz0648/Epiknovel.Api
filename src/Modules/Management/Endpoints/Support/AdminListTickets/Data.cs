using Epiknovel.Modules.Management.Domain;

namespace Epiknovel.Modules.Management.Endpoints.Support.AdminListTickets;

public class Request
{
    public TicketStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int Take { get; set; } = 25;
}

public class TicketAdminItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserDisplayName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public TicketStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastRespondedAt { get; set; }
}

public class Response 
{
    public List<TicketAdminItem> Tickets { get; set; } = new();
    public int TotalCount { get; set; }
}
