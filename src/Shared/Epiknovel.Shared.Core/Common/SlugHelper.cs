using System.Text.RegularExpressions;
using System.Text;
using System.Collections.Generic;

namespace Epiknovel.Shared.Core.Common;

public static class SlugHelper
{
    public static string ToSlug(string? text, int maxLength = 100)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        // 1. Küçük harfe çevir (İ -> i dönüşümünü doğru yapması için ToLowerInvariant yerine ToLower kullanıyoruz)
        var slug = text.ToLower();
        
        // 2. Özel karakter eşlemeleri
        var mapping = new Dictionary<string, string>
        {
            { "ö", "o" }, { "ü", "u" }, { "ş", "s" }, { "ç", "c" }, { "ı", "i" }, { "ğ", "g" },
            { "ə", "e" }, { "æ", "ae" }, { "ß", "ss" }, { " ", "-" }
        };

        foreach (var (key, value) in mapping)
        {
            slug = slug.Replace(key, value);
        }

        // 3. Alfanumerik olmayan karakterleri temizle (Sadece a-z0-9 ve - kalsın)
        slug = Regex.Replace(slug, @"[^a-z0-9-]", "");
        
        // 4. Çoklu tireleri tek tireye çevir ve kenarları temizle
        slug = Regex.Replace(slug, @"-+", "-").Trim('-');

        // 5. Uzunluk kontrolü
        if (slug.Length > maxLength)
        {
            slug = slug.Substring(0, maxLength).Trim('-');
        }

        return slug;
    }
}
