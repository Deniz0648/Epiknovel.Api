using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class ReadingProgress : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Books modülündeki BookId ile eşleşir
    public Guid BookId { get; set; }

    // Books modülündeki ChapterId ile eşleşir
    public Guid LastReadChapterId { get; set; }
    public string LastReadChapterSlug { get; set; } = string.Empty;
    public int LastReadChapterOrder { get; set; }
    public Guid? LastReadParagraphId { get; set; }
    public int TotalChapters { get; set; }

    // UserId ile eşleşir
    public Guid UserId { get; set; }

    public double ScrollPercentage { get; set; } // Örn: 0-100% (Sayfa scroll pozisyonu)
    public DateTime LastReadAt { get; set; } = DateTime.UtcNow;
}
