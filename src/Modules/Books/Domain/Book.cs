using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Domain;

public enum BookStatus
{
    Ongoing,
    Completed,
    Hiatus
}

public enum ContentRating
{
    General,
    Teen,
    Mature
}

public enum BookType
{
    Original,
    Translation
}

public class Book : BaseEntity, ISoftDelete, IOwnable, ISlugified
{
    // Author Identity modülündeki UserId ile eşleşir.
    public Guid UserId { get => AuthorId; set => AuthorId = value; }
    public Guid AuthorId { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    
    public bool IsHidden { get; set; }
    public bool IsEditorChoice { get; set; }

    public BookStatus Status { get; set; }
    public ContentRating ContentRating { get; set; }
    public BookType Type { get; set; } = BookType.Original;
    public string? OriginalAuthorName { get; set; }

    // Denormalize (Cache) Veriler
    public int VoteCount { get; set; }
    public double AverageRating { get; set; }
    public long ViewCount { get; set; }

    // Modül içi Navigasyonlar
    public virtual ICollection<Chapter> Chapters { get; set; } = new List<Chapter>();
    public virtual ICollection<Category> Categories { get; set; } = new List<Category>();
    public virtual ICollection<Tag> Tags { get; set; } = new List<Tag>();

    // ISoftDelete Implementation (BaseEntity.IsDeleted kullanılıyor)
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
