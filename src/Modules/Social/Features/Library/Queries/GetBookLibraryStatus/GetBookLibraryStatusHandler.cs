using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Library.Queries.GetBookLibraryStatus;

public class GetBookLibraryStatusHandler(SocialDbContext dbContext) : IRequestHandler<GetBookLibraryStatusQuery, Result<BookLibraryStatusResponse>>
{
    public async Task<Result<BookLibraryStatusResponse>> Handle(GetBookLibraryStatusQuery request, CancellationToken ct)
    {
        var entry = await dbContext.LibraryEntries
            .AsNoTracking()
            .Where(e => e.UserId == request.UserId && e.BookId == request.BookId)
            .Select(e => new LibraryItemResponse
            {
                Id = e.Id,
                BookId = e.BookId,
                Status = e.Status,
                AddedAt = e.AddedAt,
                LastReadAt = e.LastReadAt
            })
            .FirstOrDefaultAsync(ct);

        return Result<BookLibraryStatusResponse>.Success(new BookLibraryStatusResponse
        {
            IsAdded = entry != null,
            LibraryItem = entry
        });
    }
}
