using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using System.Collections.Generic;

namespace Epiknovel.Modules.Books.Endpoints.UpdateBook;

public class Request 
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public BookStatus Status { get; set; }
    public ContentRating ContentRating { get; set; }
    public List<Guid> CategoryIds { get; set; } = new();
    public List<string> Tags { get; set; } = new();
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
}
