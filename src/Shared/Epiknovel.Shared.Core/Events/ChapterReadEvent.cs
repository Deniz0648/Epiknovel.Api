using MediatR;

namespace Epiknovel.Shared.Core.Events;

/// <summary>
/// Bir kullanıcı bir bölümü okuduğunda (GET istiği başarılı olduğunda) fırlatılır.
/// Sosyal modülü bu olayı dinleyerek okuma geçmişini (ReadingProgress) günceller.
/// </summary>
public record ChapterReadEvent(
    Guid BookId,
    Guid ChapterId,
    Guid UserId,
    double ScrollPercentage,
    DateTime ReadAt) : INotification;
