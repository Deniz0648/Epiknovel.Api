namespace Epiknovel.Shared.Core.Interfaces;

public interface IUserRoleProvider
{
    Task AddRoleAsync(Guid userId, string roleName, CancellationToken ct = default);
    Task RemoveRoleAsync(Guid userId, string roleName, CancellationToken ct = default);
}
