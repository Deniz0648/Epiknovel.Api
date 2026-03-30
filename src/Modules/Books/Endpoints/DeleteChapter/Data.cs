using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Endpoints.DeleteChapter;

public class Request : IOwnable
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; } // BOLA
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
