using MediatR;

namespace Epiknovel.Shared.Core.Events;

/// <summary>
/// Bir kitabın arama algoritmalarında (FTS vb.) indekslenmesi veya güncellenmesi 
/// gerektiğinde Books modülünden fırlatılan asenkron olay.
/// </summary>
public record BookUpdatedEvent(
    Guid BookId,
    string Title,
    string? Description,
    string Slug,
    string? CoverImageUrl,
    string AuthorName, // Arama etiketleri için yazar adı
    IEnumerable<string> Categories, // Virgülle ayırıp gizli etiket olarak eklenecek
    IEnumerable<string> Tags,
    bool IsHidden, // Eğer gizliyse IsActive = false yapılacak
    bool IsDeleted // Eğer silindiyse indeksten çıkarılacak veya IsActive = false
) : INotification;
