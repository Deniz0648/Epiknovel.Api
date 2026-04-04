using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using System.Collections.Generic;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Endpoints.UpdateBook;

public class Request : IOwnable
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; } // BOLA check automatically via BOLAValidationPreProcessor
    
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public BookStatus Status { get; set; }
    public ContentRating ContentRating { get; set; }
    public BookType Type { get; set; }
    public string? OriginalAuthorName { get; set; }
    public List<Guid> CategoryIds { get; set; } = new();
    public List<string> Tags { get; set; } = new();
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}
