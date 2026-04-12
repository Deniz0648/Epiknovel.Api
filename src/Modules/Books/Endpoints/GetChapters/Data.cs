using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Endpoints.GetChapters;

public class Request
{
    public string BookId { get; set; } = string.Empty; // Guid string veya Slug destekler
    
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    
    public string SortBy { get; set; } = "Order"; // "Order", "PublishedAt"
    public bool SortDescending { get; set; } = false;
    
    public string? SearchTerm { get; set; }
    
    public bool IncludeDrafts { get; set; } = false; // Only for author/admin
}

public class Response
{
    public List<ChapterItem> Chapters { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
}

public class ChapterItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int Order { get; set; }
    public int WordCount { get; set; }
    public bool IsFree { get; set; }
    public int Price { get; set; }
    public ChapterStatus Status { get; set; }
    public bool IsTitleSpoiler { get; set; }
    public DateTime? PublishedAt { get; set; }
    public long ViewCount { get; set; }
    public string AuthorName { get; set; } = string.Empty;
}
