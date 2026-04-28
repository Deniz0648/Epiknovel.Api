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

    /// <summary>
    /// Kitabın var olup olmadığını ve yayında olduğunu (silinmemiş) kontrol eder.
    /// </summary>
    Task<bool> IsBookActiveAsync(Guid bookId, CancellationToken ct = default);

    /// <summary>
    /// Bölümün var olup olmadığını ve yayında olduğunu (silinmemiş) kontrol eder.
    /// </summary>
    Task<bool> IsChapterActiveAsync(Guid chapterId, CancellationToken ct = default);

    /// <summary>
    /// Verilen paragrafın gerçekten o bölüme mi ait olduğunu doğrular.
    /// </summary>
    Task<bool> IsParagraphInChapterAsync(Guid paragraphId, Guid chapterId, CancellationToken ct = default);

    /// <summary>
    /// Verilen yazarların (UserId) yayınlanan eser sayılarını toplu döner.
    /// </summary>
    Task<Dictionary<Guid, int>> GetPublishedBookCountsByAuthorIdsAsync(IEnumerable<Guid> authorIds, CancellationToken ct = default);

    /// <summary>
    /// Verilen kitabın tüm (silinmemiş) bölümlerinin ID listesini döner.
    /// </summary>
    Task<List<Guid>> GetChapterIdsByBookIdAsync(Guid bookId, CancellationToken ct = default);

    /// <summary>
    /// Bölüm ID üzerinden bağlı olduğu Kitap ID'sini döner.
    /// </summary>
    Task<Guid> GetBookIdByChapterIdAsync(Guid chapterId, CancellationToken ct = default);

    /// <summary>
    /// Kitap ID üzerinden bağlı olduğu kategori (Category) ID listesini döner.
    /// </summary>
    Task<List<Guid>> GetCategoryIdsByBookIdAsync(Guid bookId, CancellationToken ct = default);

    Task<List<Epiknovel.Shared.Core.Interfaces.Management.UserPurchasedChapterDto>> GetChapterTitlesByChaptersAsync(List<Epiknovel.Shared.Core.Interfaces.Management.UserPurchasedChapterDto> purchases, CancellationToken ct = default);
    
    /// <summary>
    /// Kitabın ana sahibini (AuthorId) döndürür.
    /// </summary>
    Task<Guid?> GetBookOwnerIdAsync(Guid bookId, CancellationToken ct = default);

    /// <summary>
    /// Verilen yazarın kitap özetlerini ve toplam bölüm sayısını döndürür.
    /// </summary>
    Task<(List<Epiknovel.Shared.Core.Interfaces.Management.UserBookDto> books, int totalChapters)> GetAuthorBooksSummaryAsync(Guid authorId, CancellationToken ct = default);

    /// <summary>
    /// Kitap ID üzerinden Slug bilgisini döner.
    /// </summary>
    Task<string?> GetBookSlugAsync(Guid bookId, CancellationToken ct = default);

    /// <summary>
    /// Bölüm ID üzerinden bağlı olduğu kitabın ve bölümün Slug bilgilerini döner.
    /// </summary>
    Task<(string? bookSlug, string? chapterSlug)> GetChapterSlugsAsync(Guid chapterId, CancellationToken ct = default);

    /// <summary>
    /// Verilen kitap ID'leri için temel bilgileri (Başlık, Slug) toplu döner.
    /// N+1 problemini önlemek için kullanılır.
    /// </summary>
    Task<Dictionary<Guid, (string Title, string Slug, double AverageRating)>> GetBookBasicsByIdsAsync(IEnumerable<Guid> bookIds, CancellationToken ct = default);
}
