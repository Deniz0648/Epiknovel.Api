namespace Epiknovel.Shared.Core.Interfaces.Management;

public interface IManagementUserProvider
{
    Task<bool> BanUserAsync(Guid userId, string reason, CancellationToken ct = default);
    Task<bool> UnbanUserAsync(Guid userId, CancellationToken ct = default);
    Task<bool> UpdateUserRoleAsync(Guid userId, IEnumerable<string> roles, CancellationToken ct = default);
    Task<bool> TriggerPasswordResetAsync(Guid userId, CancellationToken ct = default);
    Task<List<UserManagementDto>> GetPaginatedUsersAsync(DateTime? cursor, int take, string? searchString, CancellationToken ct = default);
    Task<UserManagementDetailDto?> GetUserDetailsAsync(Guid userId, CancellationToken ct = default);
    Task<Guid?> GetSuperAdminIdAsync(CancellationToken ct = default);
}

public class UserManagementDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsBanned { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class UserManagementDetailDto : UserManagementDto
{
    public decimal TokenBalance { get; set; }
    public List<WalletTransactionDto> RecentTransactions { get; set; } = new();
    public List<UserBookDto> Books { get; set; } = new();
    public int TotalChapters { get; set; }
    public List<UserPurchasedChapterDto> PurchasedChapters { get; set; } = new();
}

public class WalletTransactionDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class UserBookDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ChapterCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<UserChapterDto> Chapters { get; set; } = new();
}

public class UserChapterDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Price { get; set; }
    public bool IsFree { get; set; }
    public DateTime CreatedAt { get; set; }
}
public class UserPurchasedChapterDto
{
    public Guid BookId { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public Guid ChapterId { get; set; }
    public string ChapterTitle { get; set; } = string.Empty;
    public int Price { get; set; }
    public DateTime PurchasedAt { get; set; }
}
