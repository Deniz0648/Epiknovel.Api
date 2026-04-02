using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;

public class GetLibraryListHandler(SocialDbContext dbContext) : IRequestHandler<GetLibraryListQuery, Result<List<LibraryItemResponse>>>
{
    public async Task<Result<List<LibraryItemResponse>>> Handle(GetLibraryListQuery request, CancellationToken ct)
    {
        var query = dbContext.LibraryEntries
            .Where(e => e.UserId == request.UserId);

        if (request.Status.HasValue)
            query = query.Where(e => e.Status == request.Status.Value);

        var entries = await query
            .OrderByDescending(e => e.AddedAt)
            .Skip((request.Page - 1) * request.Size)
            .Take(request.Size)
            .Select(e => new LibraryItemResponse
            {
                Id = e.Id,
                BookId = e.BookId,
                Status = e.Status,
                AddedAt = e.AddedAt,
                LastReadAt = e.LastReadAt
            })
            .ToListAsync(ct);

        return Result<List<LibraryItemResponse>>.Success(entries);
    }
}
