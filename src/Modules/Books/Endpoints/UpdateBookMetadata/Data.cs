using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Endpoints.UpdateBookMetadata;

public class Request
{
    public Guid BookId { get; set; }
    public Guid? NewAuthorId { get; set; }
    public BookType? Type { get; set; }
    public bool? IsEditorChoice { get; set; }
    public bool? IsHidden { get; set; }
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
