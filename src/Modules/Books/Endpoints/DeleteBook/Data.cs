using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using System.Security.Claims;

namespace Epiknovel.Modules.Books.Endpoints.DeleteBook;

public class Request : IOwnable
{
    [BindFrom("Id")]
    public Guid Id { get; set; }
    
    public Guid UserId { get; set; } // BOLA PreProcessor tarafından doldurulur
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
