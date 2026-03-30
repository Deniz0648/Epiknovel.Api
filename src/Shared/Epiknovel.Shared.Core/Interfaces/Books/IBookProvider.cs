namespace Epiknovel.Shared.Core.Interfaces.Books;

public interface IBookProvider
{
    /// <summary>
    /// Verilen bölümün (Chapter) satın alma fiyatını döndürür.
    /// Bölüm ücretsiz ise 0 dönecektir.
    /// </summary>
    Task<int> GetChapterPriceAsync(Guid chapterId, CancellationToken ct = default);

    /// <summary>
    /// Verilen bölümün yazarını (RevenueOwner) döndürür.
    /// Satın alma işleminden doğan gelirin kime aktarılacağını belirlemek içindir.
    /// </summary>
    Task<Guid> GetChapterAuthorIdAsync(Guid chapterId, CancellationToken ct = default);
}
