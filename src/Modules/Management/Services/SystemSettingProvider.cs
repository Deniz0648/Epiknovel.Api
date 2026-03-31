using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Interfaces.Management;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Services;

public class SystemSettingProvider(ManagementDbContext dbContext) : ISystemSettingProvider
{
    public async Task<string?> GetSettingValueAsync(string key, CancellationToken ct = default)
    {
        var setting = await dbContext.SystemSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == key, ct);
            
        return setting?.Value;
    }

    public async Task<T?> GetSettingValueAsync<T>(string key, CancellationToken ct = default)
    {
        var value = await GetSettingValueAsync(key, ct);
        if (string.IsNullOrEmpty(value)) return default;

        try 
        {
            return (T)Convert.ChangeType(value, typeof(T));
        }
        catch 
        {
            return default;
        }
    }
}
