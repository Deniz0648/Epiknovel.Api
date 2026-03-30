using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Services;

public class BooksFileUsageProvider(BooksDbContext dbContext) : IFileUsageProvider
{
    public async Task<IEnumerable<string>> GetUsedFilesAsync()
    {
        // Books tablosundaki tüm aktif kapak görsellerini al
        return await dbContext.Books
            .Where(b => !string.IsNullOrEmpty(b.CoverImageUrl))
            .Select(b => b.CoverImageUrl!)
            .ToListAsync();
    }
}
