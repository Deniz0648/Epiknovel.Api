using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Endpoints.GetChapter;

public class Request
{
    public string Slug { get; set; } = string.Empty;
}

public class Response 
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public int Order { get; set; }
    public DateTime PublishedAt { get; set; }
    
    // Metadata for Editor
    public bool IsFree { get; set; }
    public int Price { get; set; }
    public ChapterStatus Status { get; set; }
    public bool IsTitleSpoiler { get; set; }

    public List<ParagraphDto> Paragraphs { get; set; } = new();
    public double? LastReadScrollPercentage { get; set; }
    
    // Navigasyon
    public string? NextChapterSlug { get; set; }
    public string? PreviousChapterSlug { get; set; }

    public bool IsPreview { get; set; }
    public string? PreviewMessage { get; set; }
    public bool IsTruncated { get; set; }
    public string? TruncationMessage { get; set; }
}

public class ParagraphDto
{
    public Guid Id { get; set; } // Inline Commentler için kritik
    public string Content { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int Order { get; set; }
}
