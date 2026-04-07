using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetMyBook;

public class Request 
{
    public string Slug { get; set; } = string.Empty;
}

public class Response 
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ContentRating { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? OriginalAuthorName { get; set; }
    public Guid AuthorId { get; set; }
    
    public int ChapterCount { get; set; }
    public long ViewCount { get; set; }
    public double AverageRating { get; set; }
    public int VoteCount { get; set; }
    
    public List<CategoryDto> Categories { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}
