using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Features.Books.Commands.CreateBook;

public record CreateBookCommand(
    Guid AuthorId,
    string Title,
    string Description,
    string? CoverImageUrl,
    BookStatus Status,
    ContentRating ContentRating,
    BookType Type,
    string? OriginalAuthorName,
    List<Guid> CategoryIds,
    List<string> Tags
) : IRequest<Result<CreateBookResponse>>;

public record CreateBookResponse(Guid Id, string Slug, string Message);
