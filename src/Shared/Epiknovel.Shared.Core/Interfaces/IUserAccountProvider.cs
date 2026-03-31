namespace Epiknovel.Shared.Core.Interfaces;

public interface IUserAccountProvider
{
    Task<bool> IsEmailConfirmedAsync(Guid userId, CancellationToken ct = default);
    
    /// <summary>
    /// Çoklu kullanıcı ID'lerini alıp, isimlerini (DisplayName) bir toplu liste olarak döner.
    /// N+1 problemini çözmek için kullanılır.
    /// </summary>
    Task<Dictionary<Guid, string>> GetDisplayNamesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);
}
