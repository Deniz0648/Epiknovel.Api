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
                (b.Status == Domain.BookStatus.Ongoing ||
                 b.Status == Domain.BookStatus.Completed ||
                 b.Status == Domain.BookStatus.Hiatus ||
                 b.Status == Domain.BookStatus.Cancelled))
            .GroupBy(b => b.AuthorId)
            .Select(g => new { AuthorId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AuthorId, x => x.Count, ct);
    }

    public async Task<List<Guid>> GetChapterIdsByBookIdAsync(Guid bookId, CancellationToken ct = default)
    {
        return await dbContext.Chapters
            .AsNoTracking()
            .Where(c => c.BookId == bookId)
            .Select(c => c.Id)
            .ToListAsync(ct);
    }

    public async Task<(List<Epiknovel.Shared.Core.Interfaces.Management.UserBookDto> books, int totalChapters)> GetAuthorBooksSummaryAsync(Guid authorId, CancellationToken ct = default)
    {
        var books = await dbContext.Books
            .AsNoTracking()
            .Where(x => x.AuthorId == authorId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new Epiknovel.Shared.Core.Interfaces.Management.UserBookDto
            {
                Id = x.Id,
                Title = x.Title,
                Status = x.Status.ToString(),
                CreatedAt = x.CreatedAt,
                ChapterCount = dbContext.Chapters.Count(c => c.BookId == x.Id),
                Chapters = dbContext.Chapters
                    .Where(c => c.BookId == x.Id)
                    .OrderByDescending(c => c.Order)
                    .Select(c => new Epiknovel.Shared.Core.Interfaces.Management.UserChapterDto
                    {
                        Id = c.Id,
                        Title = c.Title,
                        Price = c.Price,
                        IsFree = c.IsFree,
                        CreatedAt = c.CreatedAt
                    })
                    .ToList()
            })
            .ToListAsync(ct);

        var totalChapters = await dbContext.Chapters.CountAsync(x => x.UserId == authorId, ct);

        return (books, totalChapters);
    }

    public async Task<List<Epiknovel.Shared.Core.Interfaces.Management.UserPurchasedChapterDto>> GetChapterTitlesByChaptersAsync(List<Epiknovel.Shared.Core.Interfaces.Management.UserPurchasedChapterDto> purchases, CancellationToken ct = default)
    {
        if (purchases.Count == 0) return purchases;

        var chapterIds = purchases.Select(x => x.ChapterId).ToList();
        var chapterDetails = await dbContext.Chapters
            .AsNoTracking()
            .Where(x => chapterIds.Contains(x.Id))
            .Select(x => new { x.Id, x.Title, x.BookId })
            .ToListAsync(ct);

        var bookIds = chapterDetails.Select(x => x.BookId).Distinct().ToList();
        var bookTitles = await dbContext.Books
            .AsNoTracking()
            .Where(x => bookIds.Contains(x.Id))
            .Select(x => new { x.Id, x.Title })
            .ToDictionaryAsync(x => x.Id, x => x.Title, ct);

        foreach (var p in purchases)
        {
            var detail = chapterDetails.FirstOrDefault(x => x.Id == p.ChapterId);
            if (detail != null)
            {
                p.ChapterTitle = detail.Title;
                p.BookTitle = bookTitles.GetValueOrDefault(detail.BookId, "Bilinmeyen Kitap") ?? "Bilinmeyen Kitap";
            }
        }

        return purchases;
    }

    public async Task<Guid> GetBookIdByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        var chapter = await dbContext.Chapters
            .AsNoTracking()
            .Select(c => new { c.Id, c.BookId })
            .FirstOrDefaultAsync(c => c.Id == chapterId, ct);

        if (chapter == null)
            throw new KeyNotFoundException($"Chapter with ID {chapterId} not found.");

        return chapter.BookId;
    }

    public async Task<List<Guid>> GetCategoryIdsByBookIdAsync(Guid bookId, CancellationToken ct = default)
    {
        return await dbContext.Books
            .AsNoTracking()
            .Where(b => b.Id == bookId)
            .SelectMany(b => b.Categories.Select(c => c.Id))
            .ToListAsync(ct);
    }
}
