using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetBookList;

public class Request : PaginationRequest
{
    public string? Search { get; set; }
    public string? AuthorSlug { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? TagId { get; set; }
    public BookType? Type { get; set; }
    public BookStatus? Status { get; set; }
    public bool? IsEditorChoice { get; set; }
    public ContentRating? ContentRating { get; set; }
    
    public string SortBy { get; set; } = "CreatedAt"; // CreatedAt, ViewCount, AverageRating
    public bool SortDescending { get; set; } = true;
}

public class Response 
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? AuthorName { get; set; }
    public string? AuthorSlug { get; set; }
    public BookStatus Status { get; set; }
    public BookType Type { get; set; }
    public ContentRating ContentRating { get; set; }
    public bool IsEditorChoice { get; set; }
    public long ViewCount { get; set; }
    public double AverageRating { get; set; }
    public int VoteCount { get; set; }
    public int ChapterCount { get; set; }
    public List<string> CategoryNames { get; set; } = new();
}
