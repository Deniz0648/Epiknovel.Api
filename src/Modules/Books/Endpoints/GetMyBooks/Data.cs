using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetMyBooks;

public class Request : PaginationRequest
{
    public string? Search { get; set; }
    public BookStatus? Status { get; set; }
    public BookType? Type { get; set; }
    public string SortBy { get; set; } = "UpdatedAt";
    public bool SortDescending { get; set; } = true;
}

public class Response 
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public BookStatus Status { get; set; }
    public ContentRating ContentRating { get; set; }
    public BookType Type { get; set; }
    public int ChapterCount { get; set; }
    public long ViewCount { get; set; }
    public double AverageRating { get; set; }
    public int VoteCount { get; set; }
    public List<BookCategoryResponse> Categories { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class BookCategoryResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}
