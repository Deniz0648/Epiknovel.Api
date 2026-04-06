using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;

namespace Epiknovel.Modules.Social.Features.Library.Queries.GetBookLibraryStatus;

public record GetBookLibraryStatusQuery(
    Guid UserId,
    Guid BookId
) : IRequest<Result<BookLibraryStatusResponse>>;

public class BookLibraryStatusResponse
{
    public bool IsAdded { get; set; }
    public LibraryItemResponse? LibraryItem { get; set; }
}
