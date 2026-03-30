using Epiknovel.Shared.Core.Events;

namespace Epiknovel.Shared.Core.Interfaces;

/// <summary>
/// "Re-Index All" komutunda indekslerin sıfırdan oluşturulması için kitapları sağlar.
/// </summary>
public interface IBookSearchProvider
{
    Task<IEnumerable<BookUpdatedEvent>> GetIndexableBooksAsync();
}

/// <summary>
/// "Re-Index All" komutunda indekslerin sıfırdan oluşturulması için kullanıcıları sağlar.
/// </summary>
public interface IUserSearchProvider
{
    Task<IEnumerable<UserProfileUpdatedEvent>> GetIndexableUsersAsync();
}
