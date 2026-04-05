using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Books.Domain;

/// <summary>
/// Veritabanı işlemleri ile asenkron olayların (MediatR) atomik şekilde 
/// işlenmesini sağlayan Outbox tablosu. Özellikle search indeksi gibi 
/// veri tutarlılığı kritik yerlerde "Guaranteed Delivery" sağlar.
/// </summary>
public class OutboxMessage : BaseEntity
{
    /// <summary>
    /// Olayın tipi (örn: Epiknovel.Shared.Core.Events.BookUpdatedEvent)
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Olayın JSON formatındaki içeriği.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Mesajın başarıyla işlendiği zaman.
    /// </summary>
    public DateTime? ProcessedOnUtc { get; set; }

    /// <summary>
    /// İşleme sırasında oluşan hata mesajı.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Başarısız deneme sayısı.
    /// </summary>
    public int RetryCount { get; set; }
}
