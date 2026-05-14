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
        var baseQuery = from e in dbContext.LibraryEntries
                        join b in dbContext.BookSummaries on e.BookId equals b.Id into bj
                        from b in bj.DefaultIfEmpty()
                        join p in dbContext.ReadingProgresses on new { e.UserId, e.BookId } equals new { p.UserId, p.BookId } into pj
                        from p in pj.DefaultIfEmpty()
                        where e.UserId == request.UserId
                        select new { e, b, p };

        if (request.Status.HasValue)
            baseQuery = baseQuery.Where(x => x.e.Status == request.Status.Value);

        var entries = await baseQuery
            .OrderByDescending(x => x.e.AddedAt)
            .Skip((request.Page - 1) * request.Size)
            .Take(request.Size)
            .Select(x => new LibraryItemResponse
            {
                Id = x.e.Id,
                BookId = x.e.BookId,
                BookTitle = x.b != null ? x.b.Title : string.Empty,
                BookSlug = x.b != null ? x.b.Slug : string.Empty,
                BookCoverImageUrl = x.b != null ? x.b.CoverImageUrl : null,
                Status = x.e.Status,
                AddedAt = x.e.AddedAt,
                LastReadAt = x.e.LastReadAt,
                
                // İlerleme Bilgileri
                LastReadChapterId = x.p != null ? x.p.LastReadChapterId : (Guid?)null,
                LastReadChapterSlug = x.p != null ? x.p.LastReadChapterSlug : null,
                LastReadChapterTitle = x.p != null ? x.p.LastReadChapterTitle : null,
                LastReadParagraphId = x.p != null ? x.p.LastReadParagraphId : (Guid?)null,
                ProgressPercentage = (x.p != null && x.p.TotalChapters > 0)
                    ? (double)x.p.LastReadChapterOrder / x.p.TotalChapters * 100.0
                    : 0.0
            })
            .ToListAsync(ct);

        return Result<List<LibraryItemResponse>>.Success(entries);
    }
}
