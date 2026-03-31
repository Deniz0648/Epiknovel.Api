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
                            
                                    // 1. Kara Liste Kontrolü (Reserved Words)
                                            var blacklist = new[] { "admin", "api", "auth", "login", "register", "swagger", "system", "mod", "staff", "root", "epik" };
                                                    if (blacklist.Contains(baseSlug.ToLower()))
                                                            {
                                                                        baseSlug = $"{baseSlug}-content"; // 'admin-content' gibi değiştir
                                                                                }

                                                                                        var slug = baseSlug;
                                                                                                var suffix = 1;

                                                                                                        // 2. Unique Kontrolü
                                                                                                                while (await dbSet.AnyAsync(x => x.Slug == slug, ct))
                                                                                                                        {
                                                                                                                                    slug = $"{baseSlug}-{suffix++}";
                                                                                                                                            }

                                                                                                                                                    return slug;
                                                                                                                                                        }
                                                                                                                                                        }
                                                                                                                                                        