namespace Epiknovel.Shared.Core.Interfaces.Management;

public interface ISystemSettingProvider
{
    Task<string?> GetSettingValueAsync(string key, CancellationToken ct = default);
    Task<T?> GetSettingValueAsync<T>(string key, CancellationToken ct = default);
}
