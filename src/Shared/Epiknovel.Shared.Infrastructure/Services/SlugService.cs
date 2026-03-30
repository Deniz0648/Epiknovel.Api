using Epiknovel.Shared.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace Epiknovel.Shared.Infrastructure.Services;

public interface ISlugService
{
    Task<string> GenerateUniqueSlugAsync<T>(string title, DbSet<T> dbSet, CancellationToken ct = default) where T : class, ISlugified;
}

public class SlugService : ISlugService
{
    public async Task<string> GenerateUniqueSlugAsync<T>(string title, DbSet<T> dbSet, CancellationToken ct = default) where T : class, ISlugified
    {
        var baseSlug = Epiknovel.Shared.Core.Common.SlugHelper.ToSlug(title);
        var slug = baseSlug;
        var suffix = 1;

        // "Eski slug kalsın" mantığı için: Eğer title boş gelirse veya bir şekilde slug zaten atanmışsa 
        // bu metod sadece yeni üretimler için çağrılmalı. 
        // Unique kontrolü:
        while (await dbSet.AnyAsync(x => x.Slug == slug, ct))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }
}
