namespace Epiknovel.Shared.Core.Interfaces.Management;

public interface IManagementBookProvider
{
    Task<bool> SetBookVisibilityAsync(Guid bookId, bool isVisible, CancellationToken ct = default);
}
