using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Endpoints.CreateBook;

public class Request : IOwnable
{
    public Guid UserId { get; set; } // IOwnable: BOLAValidationPreProcessor tarafından doldurulacak/doğrulanacak
    
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    
    public BookStatus Status { get; set; } = BookStatus.Ongoing;
    public ContentRating ContentRating { get; set; } = ContentRating.General;
    public BookType Type { get; set; } = BookType.Original;
    public string? OriginalAuthorName { get; set; }
    
    public List<Guid> CategoryIds { get; set; } = new();
    public List<string> Tags { get; set; } = new();
}

public class Response 
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
