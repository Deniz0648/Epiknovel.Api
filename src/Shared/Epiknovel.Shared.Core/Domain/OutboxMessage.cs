using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Shared.Core.Domain;

/// <summary>
/// Sistem genelindeki tüm modüller için ortak Outbox yapısı.
/// Veritabanı işlemleriyle asenkron olayların atomik şekilde işlenmesini sağlar.
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
    /// Mesajın başarıyla işlendiği UTC zamanı.
    /// </summary>
    public DateTime? ProcessedAtUtc { get; set; }

    /// <summary>
    /// İşleme sırasında oluşan son hata mesajı.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Başarısız deneme sayısı.
    /// </summary>
    public int RetryCount { get; set; }
}
