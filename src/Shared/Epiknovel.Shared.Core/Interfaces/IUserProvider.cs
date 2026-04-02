using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Shared.Core.Interfaces;

public interface IUserProvider
{
    Task<bool> IsAuthorAsync(Guid userId, CancellationToken ct = default);
    Task SetAuthorStatusAsync(Guid userId, bool isAuthor, CancellationToken ct = default);

    Task<bool> IsPaidAuthorAsync(Guid userId, CancellationToken ct = default);
    Task SetPaidAuthorStatusAsync(Guid userId, bool isPaidAuthor, string? iban, CancellationToken ct = default);

    Task<Guid?> GetUserIdBySlugAsync(string slug, CancellationToken ct = default);
    Task<Dictionary<Guid, string>> GetSlugsByUserIdsAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);

    /// <summary>
    /// Kullanıcı profil bilgilerini (BOLA uyumlu) modüller arası kullanım için getirir.
    /// </summary>
    Task<Result<MyProfileResponse>> GetProfileAsync(Guid userId, string? identityName, CancellationToken ct = default);
}
