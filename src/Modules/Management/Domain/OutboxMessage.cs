using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Domain;

public class OutboxMessage : BaseEntity
{
    public string Type { get; set; } = string.Empty; // e.g. "DeductBalance"
    public string Content { get; set; } = string.Empty; // JSON serialized command/event
    public DateTime? ProcessedAt { get; set; }
    public string? Error { get; set; }
    public int AttemptCount { get; set; }
}
