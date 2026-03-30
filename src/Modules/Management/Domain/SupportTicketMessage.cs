using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Domain;

public class SupportTicketMessage : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TicketId { get; set; }
    public virtual SupportTicket Ticket { get; set; } = null!;

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsAdminResponse { get; set; }
}
