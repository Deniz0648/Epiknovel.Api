namespace Epiknovel.Shared.Core.Interfaces;

public interface IDiscordAlertService
{
    Task SendUrgentAlertAsync(string message, string? source = null, CancellationToken ct = default);
}
