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
            .Select(e => new 
            {
                Entry = e,
                Book = dbContext.BookSummaries.FirstOrDefault(b => b.Id == e.BookId),
                Progress = dbContext.ReadingProgresses.FirstOrDefault(p => p.UserId == e.UserId && p.BookId == e.BookId)
            })
            .Select(x => new LibraryItemResponse
            {
                Id = x.Entry.Id,
                BookId = x.Entry.BookId,
                BookTitle = x.Book != null ? x.Book.Title : string.Empty,
                BookSlug = x.Book != null ? x.Book.Slug : string.Empty,
                BookCoverImageUrl = x.Book != null ? x.Book.CoverImageUrl : null,
                Status = x.Entry.Status,
                AddedAt = x.Entry.AddedAt,
                LastReadAt = x.Entry.LastReadAt,
                
                // İlerleme Bilgileri
                LastReadChapterId = x.Progress != null ? x.Progress.LastReadChapterId : (Guid?)null,
                LastReadChapterSlug = x.Progress != null ? x.Progress.LastReadChapterSlug : null,
                LastReadParagraphId = x.Progress != null ? x.Progress.LastReadParagraphId : (Guid?)null,
                ProgressPercentage = (x.Progress != null && x.Progress.TotalChapters > 0)
                    ? Math.Min(100.0, Math.Round((double)x.Progress.LastReadChapterOrder / x.Progress.TotalChapters * 100.0, 1))
                    : 0.0
            })
            .ToListAsync(ct);

        return Result<List<LibraryItemResponse>>.Success(entries);
    }
}
