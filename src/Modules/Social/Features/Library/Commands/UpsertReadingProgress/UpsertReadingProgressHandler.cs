using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Library.Commands.UpsertReadingProgress;

public class UpsertReadingProgressHandler(SocialDbContext dbContext) : IRequestHandler<UpsertReadingProgressCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(UpsertReadingProgressCommand request, CancellationToken ct)
    {
        var progress = await dbContext.ReadingProgresses
            .FirstOrDefaultAsync(p => p.UserId == request.UserId && p.BookId == request.BookId, ct);

        if (progress == null)
        {
            progress = new Epiknovel.Modules.Social.Domain.ReadingProgress
            {
                UserId = request.UserId,
                BookId = request.BookId,
                LastReadChapterId = request.ChapterId,
                LastReadChapterSlug = request.ChapterSlug,
                LastReadChapterOrder = request.ChapterOrder,
                LastReadParagraphId = request.ParagraphId,
                TotalChapters = request.TotalChapters ?? 0,
                LastReadAt = DateTime.UtcNow
            };
            dbContext.ReadingProgresses.Add(progress);
        }
        else
        {
            progress.LastReadChapterId = request.ChapterId;
            progress.LastReadChapterSlug = request.ChapterSlug;
            progress.LastReadChapterOrder = request.ChapterOrder;
            progress.LastReadParagraphId = request.ParagraphId;
            progress.LastReadAt = DateTime.UtcNow;
            if (request.TotalChapters.HasValue && request.TotalChapters.Value > 0)
            {
                progress.TotalChapters = request.TotalChapters.Value;
            }
        }

        await dbContext.SaveChangesAsync(ct);
        return Result<Guid>.Success(progress.Id);
    }
}
