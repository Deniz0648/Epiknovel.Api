namespace Epiknovel.Shared.Core.Interfaces.SignalR;

public interface ISystemSettingsBroadcastService
{
    /// <summary>
    /// Bir sistem ayarı değiştiğinde tüm istemcilere bildirir.
    /// </summary>
    Task BroadcastSettingUpdatedAsync(string key, string value, CancellationToken ct = default);
}
