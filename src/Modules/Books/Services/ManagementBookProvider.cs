using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Books.Services;

public class ManagementBookProvider(BooksDbContext dbContext, IUserAccountProvider userAccountProvider) : IManagementBookProvider
{
    public async Task<bool> SetBookVisibilityAsync(Guid bookId, bool isVisible, CancellationToken ct = default)
    {
        var book = await dbContext.Books.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == bookId, ct);
        if (book == null) return false;

        book.IsHidden = !isVisible;
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteBookAsync(Guid bookId, CancellationToken ct = default)
    {
        var book = await dbContext.Books.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == bookId, ct);
        if (book == null) return false;

        var now = DateTime.UtcNow;
        // Mark chapters as deleted first
        await dbContext.Chapters
            .Where(c => c.BookId == bookId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.IsDeleted, true)
                .SetProperty(c => c.DeletedAt, now), ct);

        dbContext.Books.Remove(book); // This will be handled by SoftDeleteInterceptor for the book entity itself
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Result<PagedResult<ManagementBookDto>>> GetBooksAsync(string? type, bool? isHidden, string? searchTerm, int page, int pageSize, CancellationToken ct = default)
    {
        var query = dbContext.Books.AsNoTracking().IgnoreQueryFilters();

        if (!string.IsNullOrEmpty(type))
        {
            if (Enum.TryParse<BookType>(type, true, out var t))
                query = query.Where(b => b.Type == t);
        }

        if (isHidden.HasValue)
            query = query.Where(b => b.IsHidden == isHidden.Value);

        if (!string.IsNullOrEmpty(searchTerm))
            query = query.Where(b => b.Title.Contains(searchTerm) || (b.OriginalAuthorName != null && b.OriginalAuthorName.Contains(searchTerm)));

        var totalCount = await query.CountAsync(ct);
        var books = await query.OrderByDescending(b => b.CreatedAt)
                                .Skip((page - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync(ct);

        // Orijinal kitapların yazar isimlerini çek
        var originalAuthorIds = books.Where(b => b.Type == BookType.Original).Select(b => b.AuthorId).Distinct().ToArray();
        var authorNames = await userAccountProvider.GetDisplayNamesAsync(originalAuthorIds, ct);

        var dtos = books.Select(b => {
            string authorName = "Unknown";
            if (b.Type == BookType.Translation)
            {
                authorName = b.OriginalAuthorName ?? "Unknown";
            }
            else
            {
                authorName = authorNames.GetValueOrDefault(b.AuthorId) ?? "Yazar";
            }

            return new ManagementBookDto(
                b.Id, 
                b.Title, 
                b.Slug, 
                authorName,
                b.Type.ToString(), 
                b.IsHidden, 
                b.IsEditorChoice, 
                b.ViewCount,
                b.CoverImageUrl,
                b.CreatedAt);
        }).ToList();

        return Result<PagedResult<ManagementBookDto>>.Success(PagedResult<ManagementBookDto>.Create(dtos, totalCount, page, pageSize));
    }

    public async Task<List<ManagementSimpleDto>> GetCategoriesAsync(CancellationToken ct = default)
    {
        return await dbContext.Categories.AsNoTracking()
            .Select(c => new ManagementSimpleDto(c.Id, c.Name, c.Slug, c.Description, c.IconUrl))
            .ToListAsync(ct);
    }

    public async Task<bool> CreateCategoryAsync(string name, string? description, string? iconUrl, string? slug, CancellationToken ct = default)
    {
        var category = new Category 
        { 
            Name = name, 
            Description = description,
            IconUrl = iconUrl,
            Slug = slug ?? name.ToLower().Replace(" ", "-") 
        };
        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UpdateCategoryAsync(Guid id, string name, string? description, string? iconUrl, string? slug, CancellationToken ct = default)
    {
        var category = await dbContext.Categories.FindAsync(new object[] { id }, ct);
        if (category == null) return false;
        category.Name = name;
        category.Description = description;
        category.IconUrl = iconUrl;
        if (slug != null) category.Slug = slug;
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id, CancellationToken ct = default)
    {
        var category = await dbContext.Categories.FindAsync(new object[] { id }, ct);
        if (category == null) return false;
        dbContext.Categories.Remove(category);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<ManagementSimpleDto>> GetTagsAsync(CancellationToken ct = default)
    {
        return await dbContext.Tags.AsNoTracking()
            .Select(t => new ManagementSimpleDto(t.Id, t.Name, t.Slug, null))
            .ToListAsync(ct);
    }

    public async Task<bool> CreateTagAsync(string name, string? slug, CancellationToken ct = default)
    {
        var tag = new Tag { Name = name, Slug = slug ?? name.ToLower().Replace(" ", "-") };
        dbContext.Tags.Add(tag);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UpdateTagAsync(Guid id, string name, string? slug, CancellationToken ct = default)
    {
        var tag = await dbContext.Tags.FindAsync(new object[] { id }, ct);
        if (tag == null) return false;
        tag.Name = name;
        if (slug != null) tag.Slug = slug;
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DeleteTagAsync(Guid id, CancellationToken ct = default)
    {
        var tag = await dbContext.Tags.FindAsync(new object[] { id }, ct);
        if (tag == null) return false;
        dbContext.Tags.Remove(tag);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Guid> CreateTranslatedBookAsync(Guid authorId, string title, string description, string? coverImageUrl, int status, int rating, string originalAuthorName, List<Guid> categoryIds, List<string> tags, CancellationToken ct = default)
    {
        // First find or create tags
        var existingTags = await dbContext.Tags.Where(t => tags.Contains(t.Name)).ToListAsync(ct);
        var newTags = tags.Except(existingTags.Select(et => et.Name))
                         .Select(t => new Tag { Name = t, Slug = t.ToLower().Replace(" ", "-") })
                         .ToList();
        
        if (newTags.Any())
        {
            dbContext.Tags.AddRange(newTags);
        }

        var allTags = existingTags.Concat(newTags).ToList();

        // Create book
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = title,
            Slug = GenerateSlug(title),
            Description = description,
            CoverImageUrl = coverImageUrl,
            Status = (BookStatus)status,
            ContentRating = (ContentRating)rating,
            Type = BookType.Translation,
            OriginalAuthorName = originalAuthorName,
            IsHidden = false,
            CreatedAt = DateTime.UtcNow,
            AuthorId = authorId
        };

        // Assign categories and tags
        book.Categories = await dbContext.Categories.Where(c => categoryIds.Contains(c.Id)).ToListAsync(ct);
        book.Tags = allTags;

        dbContext.Books.Add(book);
        await dbContext.SaveChangesAsync(ct);
        return book.Id;
    }

    public async Task<ManagementBookDetailsDto?> GetBookDetailsAsync(Guid bookId, CancellationToken ct = default)
    {
        var book = await dbContext.Books
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Include(b => b.Categories)
            .Include(b => b.Tags)
            .FirstOrDefaultAsync(b => b.Id == bookId, ct);

        if (book == null) return null;

        return new ManagementBookDetailsDto(
            book.Id,
            book.Title,
            book.Description,
            book.CoverImageUrl,
            (int)book.Status,
            (int)book.ContentRating,
            book.OriginalAuthorName,
            book.Categories.Select(c => c.Id).ToList(),
            book.Tags.Select(t => t.Name).ToList()
        );
    }

    public async Task<bool> UpdateBookDetailsAsync(Guid bookId, string title, string description, string? coverImageUrl, int status, int rating, string? originalAuthorName, List<Guid> categoryIds, List<string> tags, CancellationToken ct = default)
    {
        var book = await dbContext.Books
            .IgnoreQueryFilters()
            .Include(b => b.Categories)
            .Include(b => b.Tags)
            .FirstOrDefaultAsync(b => b.Id == bookId, ct);

        if (book == null) return false;

        book.Title = title;
        book.Slug = GenerateSlug(title);
        book.Description = description;
        book.CoverImageUrl = coverImageUrl;
        book.Status = (BookStatus)status;
        book.ContentRating = (ContentRating)rating;
        book.OriginalAuthorName = originalAuthorName;

        // Tags logic (simplified - clear and re-add for simplicity in this management context)
        var existingTags = await dbContext.Tags.Where(t => tags.Contains(t.Name)).ToListAsync(ct);
        var newTags = tags.Except(existingTags.Select(et => et.Name))
                         .Select(t => new Tag { Name = t, Slug = t.ToLower().Replace(" ", "-") })
                         .ToList();
        if (newTags.Any()) dbContext.Tags.AddRange(newTags);
        var allTags = existingTags.Concat(newTags).ToList();

        book.Categories.Clear();
        book.Tags.Clear();

        book.Categories = await dbContext.Categories.Where(c => categoryIds.Contains(c.Id)).ToListAsync(ct);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> AssignBookMembersAsync(Guid bookId, List<BookMemberAssignmentDto> members, CancellationToken ct = default)
    {
        var book = await dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId, ct);
        if (book == null || book.Type != BookType.Translation) return false;

        // 1. Efficiently remove ALL existing members for this book (atomic & bypassing tracking issues)
        await dbContext.BookMembers.Where(bm => bm.BookId == bookId).ExecuteDeleteAsync(ct);

        // 2. Add new members
        var newMembers = members.Select(m => {
            if (!Enum.TryParse<BookMemberRole>(m.Role, out var role)) role = BookMemberRole.Translator;
            return new BookMember 
            { 
                BookId = bookId, 
                UserId = m.UserId, 
                Role = role,
                UserDisplayName = m.DisplayName
            };
        }).ToList();

        if (newMembers.Any())
        {
            await dbContext.BookMembers.AddRangeAsync(newMembers, ct);
            await dbContext.SaveChangesAsync(ct);
        }
        
        return true;
    }

    public async Task<List<BookMemberAssignmentDto>> GetBookMembersAsync(Guid bookId, CancellationToken ct = default)
    {
        return await dbContext.BookMembers
            .Where(bm => bm.BookId == bookId)
            .Select(bm => new BookMemberAssignmentDto(bm.UserId, bm.UserDisplayName, bm.Role.ToString()))
            .ToListAsync(ct);
    }

    private static string GenerateSlug(string title)
    {
        return title.ToLower()
            .Replace(" ", "-")
            .Replace("ö", "o")
            .Replace("ü", "u")
            .Replace("ı", "i")
            .Replace("ş", "s")
            .Replace("ç", "c")
            .Replace("ğ", "g")
            .Replace("&", "and")
            .Replace("?", "")
            .Replace("!", "")
            .Replace(".", "")
            .Replace(",", "")
            .Replace("'", "")
            .Replace("\"", "")
            .Trim('-');
    }
}
