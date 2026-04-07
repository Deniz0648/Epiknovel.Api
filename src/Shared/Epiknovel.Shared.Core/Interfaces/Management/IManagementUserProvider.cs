namespace Epiknovel.Shared.Core.Interfaces.Management;

public interface IManagementUserProvider
{
    Task<bool> BanUserAsync(Guid userId, string reason, CancellationToken ct = default);
    Task<bool> UnbanUserAsync(Guid userId, CancellationToken ct = default);
    Task<bool> UpdateUserRoleAsync(Guid userId, string role, CancellationToken ct = default);
    Task<bool> TriggerPasswordResetAsync(Guid userId, CancellationToken ct = default);
    Task<List<UserManagementDto>> GetPaginatedUsersAsync(DateTime? cursor, int take, string? searchString, CancellationToken ct = default);
    Task<Guid?> GetSuperAdminIdAsync(CancellationToken ct = default);
}

public class UserManagementDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsBanned { get; set; }
    public List<string> Roles { get; set; } = new();
}
