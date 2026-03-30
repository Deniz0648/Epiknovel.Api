using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetBookList;

public class Request : PaginationRequest
{
    public string? Search { get; set; }
    public Guid? CategoryId { get; set; }
}

public class Response 
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? AuthorName { get; set; } // TODO: UserProfile tablosundan çekilecek
}
