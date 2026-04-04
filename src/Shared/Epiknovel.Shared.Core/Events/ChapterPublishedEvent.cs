using MediatR;

namespace Epiknovel.Shared.Core.Events;

/// <summary>
/// Bir kitap bölümü başarıyla yayınlandığında fırlatılır. 
/// </summary>
public record ChapterPublishedEvent(
    Guid BookId, 
    string BookTitle,
    Guid ChapterId, 
    string ChapterTitle, 
    string ChapterSlug, 
    Guid UserId, 
    DateTime PublishedAt) : INotification;
