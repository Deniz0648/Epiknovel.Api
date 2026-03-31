using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Domain;

public enum ChapterStatus
{
    Draft,
    Published,
    Scheduled
}

public class Chapter : BaseEntity, IOwnable, ISlugified
{
    public Guid BookId { get; set; }
    public virtual Book Book { get; set; } = null!;

    public Guid UserId { get; set; } // Author veya Editor
    
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public int Order { get; set; }
    
    public int Price { get; set; } // Coin cinsinden
    public int? DiscountedPrice { get; set; } // Coin cinsinden (Pre-calculated)
    public bool IsFree { get; set; }
    
    public DateTime? PublishedAt { get; set; }
    public DateTime? ScheduledPublishDate { get; set; } // Zamanlanmış yayın tarihi
    public ChapterStatus Status { get; set; }
    public bool IsTitleSpoiler { get; set; }
    public long ViewCount { get; set; }

    // Modül içi Navigasyonlar
    public virtual ICollection<Paragraph> Paragraphs { get; set; } = new List<Paragraph>();

    public bool IsHidden { get; set; }

    public override void UndoDelete()
    {
        base.UndoDelete();
        IsHidden = false;
    }
}
