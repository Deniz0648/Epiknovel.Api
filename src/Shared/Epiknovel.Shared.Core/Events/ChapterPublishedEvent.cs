using MediatR;

namespace Epiknovel.Shared.Core.Events;

/// <summary>
/// Bir kitap bölümü başarıyla yayınlandığında fırlatılır. 
/// </summary>
public record ChapterPublishedEvent(
    Guid BookId, 
    string BookTitle,
    string BookSlug, // 🌲 Added for Frontend Links
    Guid ChapterId, 
    string ChapterTitle, 
    string ChapterSlug, 
    Guid UserId, 
    DateTime PublishedAt) : INotification;
