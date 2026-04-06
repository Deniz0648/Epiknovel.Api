using System;

namespace Epiknovel.Shared.Core.Constants;

/// <summary>
/// Proje genelinde kullanılan önbellek (OutputCache) etiketlerini yönetir.
/// Redis gruplama için prefix (bk:, chp:) formatını kullanır.
/// </summary>
public static class CacheTags
{
    // 📚 Kitap Bazlı Etiketler
    public const string AllBooks = "bk:all";
    public static string Book(Guid id) => $"bk:{id}";
    public static string Book(string slug) => $"bk:s:{slug}";
    
    // 📜 Bölüm Bazlı Etiketler
    public static string Chapters(Guid bookId) => $"bk:chp:{bookId}";
    
    // 🏷️ Kategori & Etiket Bazlı
    public const string AllCategories = "cat:all";
    public const string AllTags = "tag:all";
}
