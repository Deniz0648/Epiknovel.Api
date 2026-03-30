using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Services;

public class UsersFileUsageProvider(UsersDbContext dbContext) : IFileUsageProvider
{
    public async Task<IEnumerable<string>> GetUsedFilesAsync()
    {
        // Kullanıcı profillerindeki aktif avatarları al
        return await dbContext.UserProfiles
            .Where(p => !string.IsNullOrEmpty(p.AvatarUrl))
            .Select(p => p.AvatarUrl!)
            .ToListAsync();
    }
}
