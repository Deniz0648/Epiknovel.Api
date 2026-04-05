using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetBook;

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
    public string AuthorName { get; set; } = "Yazar";
    public Guid AuthorId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ContentRating { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    
    public List<CategoryDto> Categories { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    
    public int VoteCount { get; set; }
    public double AverageRating { get; set; }
    public int? UserRating { get; set; }
    public long ViewCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}
