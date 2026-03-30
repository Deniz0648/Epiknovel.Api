using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Services;

public class BookSearchProvider(BooksDbContext dbContext) : IBookSearchProvider
{
    public async Task<IEnumerable<BookUpdatedEvent>> GetIndexableBooksAsync()
    {
        // Yalnızca silinmemiş kitapları alıyoruz (QueryFilter var gerçi ama garanti olsun)
        var books = await dbContext.Books
            .Include(b => b.Categories)
            .Include(b => b.Tags)
            .Where(b => !b.IsDeleted)
            .ToListAsync();

        return books.Select(b => new BookUpdatedEvent(
            BookId: b.Id,
            Title: b.Title,
            Description: b.Description,
            Slug: b.Slug,
            CoverImageUrl: b.CoverImageUrl,
            AuthorName: b.OriginalAuthorName ?? string.Empty,
            Categories: b.Categories.Select(c => c.Name),
            Tags: b.Tags.Select(t => t.Name),
            IsHidden: b.IsHidden,
            IsDeleted: b.IsDeleted
        ));
    }
}
