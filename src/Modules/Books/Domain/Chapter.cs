using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Domain;

public enum ChapterStatus
{
    Draft,
    Published,
    Scheduled
}

public class Chapter : ISoftDelete, IOwnable, ISlugified
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid BookId { get; set; }
    public virtual Book Book { get; set; } = null!;

    public Guid UserId { get; set; } // Author veya Editor
    
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public int Order { get; set; }
    
    public int Price { get; set; } // Coin cinsinden
    public bool IsFree { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public ChapterStatus Status { get; set; }
    public bool IsTitleSpoiler { get; set; }
    public long ViewCount { get; set; }

    // Modül içi Navigasyonlar
    public virtual ICollection<Paragraph> Paragraphs { get; set; } = new List<Paragraph>();

    // ISoftDelete Implementation
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
