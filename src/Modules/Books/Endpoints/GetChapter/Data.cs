using MessagePack;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Endpoints.GetChapter;

public class Request
{
    public string Slug { get; set; } = string.Empty;
}

[MessagePackObject]
public class Response 
{
    [Key(0)]
    public Guid Id { get; set; }
    [Key(1)]
    public string Title { get; set; } = string.Empty;
    [Key(2)]
    public int WordCount { get; set; }
    [Key(3)]
    public int Order { get; set; }
    [Key(4)]
    public DateTime PublishedAt { get; set; }
    
    // Metadata for Editor
    [Key(5)]
    public bool IsFree { get; set; }
    [Key(6)]
    public int Price { get; set; }
    [Key(7)]
    public ChapterStatus Status { get; set; }
    [Key(8)]
    public bool IsTitleSpoiler { get; set; }

    [Key(9)]
    public List<ParagraphDto> Paragraphs { get; set; } = new();
    
    [IgnoreMember]
    public double? LastReadScrollPercentage { get; set; }
    
    // Navigasyon
    [Key(10)]
    public string BookTitle { get; set; } = string.Empty;
    [Key(11)]
    public string BookSlug { get; set; } = string.Empty;
    [Key(12)]
    public string? NextChapterSlug { get; set; }
    [Key(13)]
    public string? PreviousChapterSlug { get; set; }

    [IgnoreMember]
    public bool IsPreview { get; set; }
    [IgnoreMember]
    public string? PreviewMessage { get; set; }
    [Key(14)]
    public bool IsTruncated { get; set; }
    [Key(15)]
    public string? TruncationMessage { get; set; }
    [Key(16)]
    public int TotalChapters { get; set; }
    [Key(17)]
    public Guid BookId { get; set; }
    [Key(18)]
    public Guid AuthorUserId { get; set; }
    [Key(19)]
    public long ViewCount { get; set; }
    [Key(20)]
    public DateTime? ScheduledPublishDate { get; set; }
}

[MessagePackObject]
public class ParagraphDto
{
    [Key(0)]
    public Guid Id { get; set; } // Inline Commentler için kritik
    [Key(1)]
    public string Content { get; set; } = string.Empty;
    [Key(2)]
    public string Type { get; set; } = string.Empty;
    [Key(3)]
    public int Order { get; set; }
}
