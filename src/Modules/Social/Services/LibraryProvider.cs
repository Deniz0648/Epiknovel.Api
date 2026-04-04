using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Epiknovel.Modules.Social.Services;

public class LibraryProvider(SocialDbContext dbContext) : ILibraryProvider
{
    public async Task<List<Guid>> GetSubscribersAsync(Guid bookId, CancellationToken ct = default)
    {
        // Kitabı kütüphanesine eklemiş ve aktif (isDeleted olmayan) kullanıcılar
        return await dbContext.LibraryEntries
            .AsNoTracking()
            .Where(x => x.BookId == bookId)
            .Select(x => x.UserId)
            .Distinct()
            .ToListAsync(ct);
    }
}
