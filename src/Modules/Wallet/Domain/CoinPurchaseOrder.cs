using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Domain;

public enum OrderStatus
{
    Pending,
    Paid,
    Failed,
    Refunded,
    AwaitingRefund
}

public class CoinPurchaseOrder : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // Satın alan kullanıcı
    public Guid UserId { get; set; }

    public Guid CoinPackageId { get; set; }
    public virtual CoinPackage Package { get; set; } = null!;

    // Fiyat ve Bakiye (Snapshots)
    public decimal PricePaid { get; set; } // O anki paket fiyatı (TL vs)
    public decimal CoinAmount { get; set; } // O paketin vereceği coin miktarı (Bonus dahil)
    public string BuyerEmail { get; set; } = string.Empty; // Notifikasyon için
    
    // Iyzico / Ödeme Bağlantısı
    public string IyzicoConversationId { get; set; } = string.Empty; // Checkout Form Başlatma veya Conversation ID
    public string IyzicoPaymentId { get; set; } = string.Empty; // İşlem bitince dolacak
    public string IyzicoToken { get; set; } = string.Empty; // Başlatmada dönen Checkout Form Token'ı

    // Concurrency (Eşzamanlılık) Kontrolü (PostgreSQL xmin'e map edilir)
    public uint Version { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    // Yöneticinin sisteme sonradan yükleyeceği resmi E-Fatura belgesi
    public string? InvoiceFileUrl { get; set; } // Deprecated: GUID/Filename list
    public Guid? InvoiceDocumentId { get; set; } // Compliance modülündeki SecureDocumentId
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}
