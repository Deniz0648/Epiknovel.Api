using MediatR;

namespace Epiknovel.Shared.Core.Events;

/// <summary>
/// Bir kitap bölümü başarıyla yayınlandığında fırlatılır. 
/// Bu sayede Arama, Bildirim ve Sosyal modüller asenkron olarak haberdar edilir.
/// </summary>
public record ChapterPublishedEvent(
    Guid BookId, 
    Guid ChapterId, 
    string Title, 
    string Slug, 
    Guid UserId, 
    DateTime PublishedAt) : INotification;
