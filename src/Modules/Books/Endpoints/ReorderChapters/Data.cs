using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Endpoints.ReorderChapters;

public class Request : IOwnable
{
    public Guid UserId { get; set; } // BOLA
    public Guid BookId { get; set; }
    public List<Guid> ChapterIds { get; set; } = new();
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
