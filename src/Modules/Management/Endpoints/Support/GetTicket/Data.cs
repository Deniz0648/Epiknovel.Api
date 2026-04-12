using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Management.Domain;

namespace Epiknovel.Modules.Management.Endpoints.Support.GetTicket;

public class Request : IOwnable
{
    public Guid UserId { get; set; }
    public Guid Id { get; set; }
}

public class Response 
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<MessageDto> Messages { get; set; } = new();
}

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserDisplayName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsAdminResponse { get; set; }
}
