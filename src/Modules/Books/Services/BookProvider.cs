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

    public async Task<bool> IsBookActiveAsync(Guid bookId, CancellationToken ct = default)
    {
        // GlobalFilter (!IsDeleted) otomatik uygulanacaktır.
        return await dbContext.Books.AnyAsync(x => x.Id == bookId, ct);
    }

    public async Task<bool> IsChapterActiveAsync(Guid chapterId, CancellationToken ct = default)
    {
        // GlobalFilter (!IsDeleted) otomatik uygulanacaktır.
        return await dbContext.Chapters.AnyAsync(x => x.Id == chapterId, ct);
    }

    public async Task<bool> IsParagraphInChapterAsync(Guid paragraphId, Guid chapterId, CancellationToken ct = default)
    {
        // Paragrafın hem var olduğunu hem de o bölüme (Chapter) ait olduğunu doğrula
        return await dbContext.Paragraphs.AnyAsync(x => x.Id == paragraphId && x.ChapterId == chapterId, ct);
    }

    public async Task<Dictionary<Guid, int>> GetPublishedBookCountsByAuthorIdsAsync(IEnumerable<Guid> authorIds, CancellationToken ct = default)
    {
        var authorIdList = authorIds.Distinct().ToList();
        if (authorIdList.Count == 0)
        {
            return new Dictionary<Guid, int>();
        }

        return await dbContext.Books
            .AsNoTracking()
            .Where(b =>
                authorIdList.Contains(b.AuthorId) &&
                !b.IsHidden &&
                (b.Status == Domain.BookStatus.Published ||
                 b.Status == Domain.BookStatus.Ongoing ||
                 b.Status == Domain.BookStatus.Completed ||
                 b.Status == Domain.BookStatus.Hiatus))
            .GroupBy(b => b.AuthorId)
            .Select(g => new { AuthorId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AuthorId, x => x.Count, ct);
    }
}
