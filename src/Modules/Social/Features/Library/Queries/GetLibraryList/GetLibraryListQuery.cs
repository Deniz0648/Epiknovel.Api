using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Modules.Social.Domain;

namespace Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;

public record GetLibraryListQuery(
    Guid UserId,
    ReadingStatus? Status,
    int Page,
    int Size
) : IRequest<Result<List<LibraryItemResponse>>>;

public record LibraryItemResponse
{
    public Guid Id { get; init; }
    public Guid BookId { get; init; }
    public ReadingStatus Status { get; init; }
    public DateTime AddedAt { get; init; }
    public DateTime? LastReadAt { get; init; }
}
