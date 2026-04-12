using Epiknovel.Shared.Core.Interfaces;
using System;

namespace Epiknovel.Modules.Wallet.Domain;

public enum WithdrawStatus
{
    Pending,
    Approved,
    Rejected,
    Completed
}

public class WithdrawRequest : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public decimal Amount { get; set; } // TL bazında çekilmek istenen tutar
    public string IBAN { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
    public WithdrawStatus Status { get; set; } = WithdrawStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public string? ReceiptDocumentId { get; set; } // Ödeme Dekontu (Compliance Belge ID)
}
