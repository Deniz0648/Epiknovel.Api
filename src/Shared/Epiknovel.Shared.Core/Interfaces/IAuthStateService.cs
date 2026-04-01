namespace Epiknovel.Shared.Core.Interfaces;

public interface IAuthStateService
{
    Task HandlePermissionsChangedAsync(Guid userId, string reason, CancellationToken ct = default);
}
