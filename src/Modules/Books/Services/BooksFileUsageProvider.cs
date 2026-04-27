using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Services;

public class BooksFileUsageProvider(BooksDbContext dbContext) : IFileUsageProvider
{
    public async Task<IEnumerable<string>> GetUsedFilesAsync()
    {
        var usedFiles = new List<string>();

        // 1. Kitap Kapakları (Çöp kutusundakiler dahil)
        var bookCovers = await dbContext.Books
            .IgnoreQueryFilters()
            .Where(b => !string.IsNullOrEmpty(b.CoverImageUrl))
            .Select(b => b.CoverImageUrl!)
            .ToListAsync();
        usedFiles.AddRange(bookCovers);

        // 2. Kategori İkonları
        var categoryIcons = await dbContext.Categories
            .IgnoreQueryFilters()
            .Where(c => !string.IsNullOrEmpty(c.IconUrl))
            .Select(c => c.IconUrl!)
            .ToListAsync();
        usedFiles.AddRange(categoryIcons);

        // 3. Bölüm İçi Görseller (Paragraf bazlı)
        var paragraphImages = await dbContext.Paragraphs
            .IgnoreQueryFilters()
            .Where(p => p.Type == Domain.ParagraphType.Image && !string.IsNullOrEmpty(p.Content))
            .Select(p => p.Content)
            .ToListAsync();
        usedFiles.AddRange(paragraphImages);

        return usedFiles;
    }
}
