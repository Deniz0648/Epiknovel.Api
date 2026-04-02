using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetRecentUpdates;

public class Request : PaginationRequest
{
    public string? Search { get; set; }
}

public class UpdateItem
{
    public Guid ChapterId { get; set; }
    public string ChapterTitle { get; set; } = string.Empty;
    public string ChapterSlug { get; set; } = string.Empty;
    public double Order { get; set; }
    public DateTime? PublishedAt { get; set; }

    public string BookTitle { get; set; } = string.Empty;
    public string BookSlug { get; set; } = string.Empty;
    public string? BookCoverImageUrl { get; set; }
    public List<string> BookCategories { get; set; } = new();
}

public class Response 
{
    public List<UpdateItem> Updates { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => PageNumber < TotalPages;
}
