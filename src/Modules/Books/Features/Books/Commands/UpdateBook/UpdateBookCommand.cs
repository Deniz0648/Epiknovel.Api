using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;

namespace Epiknovel.Modules.Books.Features.Books.Commands.UpdateBook;

public record UpdateBookCommand : IRequest<Result<UpdateBookResponse>>, IOwnable
{
    public Guid Id { get; init; }
    public Guid UserId { get; set; }
    public bool IsAdmin { get; set; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? CoverImageUrl { get; init; }
    public BookStatus Status { get; init; }
    public ContentRating ContentRating { get; init; }
    public BookType Type { get; init; }
    public string? OriginalAuthorName { get; init; }
    public List<Guid> CategoryIds { get; init; } = new();
    public List<string> Tags { get; init; } = new();
}

public record UpdateBookResponse(string Message, string Slug);
