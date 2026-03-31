using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Interfaces.Management;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Books.Services;

public class ManagementBookProvider(BooksDbContext dbContext) : IManagementBookProvider
{
    public async Task<bool> SetBookVisibilityAsync(Guid bookId, bool isVisible, CancellationToken ct = default)
    {
        var book = await dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId, ct);
        if (book == null) return false;

        book.IsHidden = !isVisible; // isVisible = true means IsHidden = false
        await dbContext.SaveChangesAsync(ct);
        return true;
    }
}
