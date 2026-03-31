using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Domain;

public enum TicketStatus
{
    Open,
    InReview,
    Resolved,
    Closed
}

public class SupportTicket : BaseEntity, ISoftDelete, IOwnable
{
    // Yaratan UserId
    public Guid UserId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    
    public DateTime? LastRespondedAt { get; set; }
    public Guid? AssignedToUserId { get; set; }

    // Modül içi navigasyon
    public virtual ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}
