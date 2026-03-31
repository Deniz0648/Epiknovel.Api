using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Management.Domain;

public enum PayoutStatus
{
    Pending,
    Processing,
    Completed,
    Rejected,
    Failed
}

public class PayoutRequest : BaseEntity, ISoftDelete, IOwnable
{
    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    public decimal Amount { get; set; }
    public string Iban { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;

    public PayoutStatus Status { get; set; } = PayoutStatus.Pending;
    public string? AdminNote { get; set; }
    public string? FailureReason { get; set; }
    
    // Safety: Idempotency Key matching the Request-Header
    public string? IdempotencyKey { get; set; }
    
    public DateTime? ProcessedAt { get; set; }
    public Guid? ProcessedByUserId { get; set; }
}
