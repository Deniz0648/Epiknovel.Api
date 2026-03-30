using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Interfaces.Books;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Books.Services;

public class BookProvider(BooksDbContext dbContext) : IBookProvider
{
    public async Task<int> GetChapterPriceAsync(Guid chapterId, CancellationToken ct = default)
    {
        var chapter = await dbContext.Chapters
            .AsNoTracking()
            .Select(c => new { c.Id, c.IsFree, c.Price })
            .FirstOrDefaultAsync(c => c.Id == chapterId, ct);

        if (chapter == null)
            throw new KeyNotFoundException($"Chapter with ID {chapterId} not found.");

        return chapter.IsFree ? 0 : chapter.Price;
    }

    public async Task<Guid> GetChapterAuthorIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        var chapter = await dbContext.Chapters
            .AsNoTracking()
            .Select(c => new { c.Id, c.UserId }) // UserId is the author/owner
            .FirstOrDefaultAsync(c => c.Id == chapterId, ct);

        if (chapter == null)
            throw new KeyNotFoundException($"Chapter with ID {chapterId} not found.");

        return chapter.UserId;
    }
}
