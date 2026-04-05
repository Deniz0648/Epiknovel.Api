using Ganss.Xss;

namespace Epiknovel.Shared.Infrastructure.Security;

public static class SanitizerHelper
{
    private static readonly HtmlSanitizer _sanitizer;

    static SanitizerHelper()
    {
        _sanitizer = new HtmlSanitizer();

        // 1. İzin Verilen Etiketler (Whitelist)
        // Okuma deneyimi için gerekli temel etiketler
        _sanitizer.AllowedTags.Clear();
        _sanitizer.AllowedTags.Add("p");
        _sanitizer.AllowedTags.Add("b");
        _sanitizer.AllowedTags.Add("i");
        _sanitizer.AllowedTags.Add("u");
        _sanitizer.AllowedTags.Add("s");
        _sanitizer.AllowedTags.Add("strong");
        _sanitizer.AllowedTags.Add("em");
        _sanitizer.AllowedTags.Add("h1");
        _sanitizer.AllowedTags.Add("h2");
        _sanitizer.AllowedTags.Add("h3");
        _sanitizer.AllowedTags.Add("h4");
        _sanitizer.AllowedTags.Add("blockquote");
        _sanitizer.AllowedTags.Add("br");
        _sanitizer.AllowedTags.Add("hr");
        _sanitizer.AllowedTags.Add("ul");
        _sanitizer.AllowedTags.Add("ol");
        _sanitizer.AllowedTags.Add("li");
        _sanitizer.AllowedTags.Add("img");
        _sanitizer.AllowedTags.Add("iframe");

        // 2. İzin Verilen Öznitelikler (Attributes)
        _sanitizer.AllowedAttributes.Clear();
        _sanitizer.AllowedAttributes.Add("src");
        _sanitizer.AllowedAttributes.Add("alt");
        _sanitizer.AllowedAttributes.Add("title");
        _sanitizer.AllowedAttributes.Add("width");
        _sanitizer.AllowedAttributes.Add("height");
        _sanitizer.AllowedAttributes.Add("class"); // Sadece güvenli class'lar için ilerde filtre eklenebilir
        _sanitizer.AllowedAttributes.Add("frameborder");
        _sanitizer.AllowedAttributes.Add("allowfullscreen");

        // 3. Güvenli IFrame Kaynakları (Technical Decision 2)
        _sanitizer.AllowedAtRules.Clear();
        _sanitizer.AllowedSchemes.Clear();
        _sanitizer.AllowedSchemes.Add("http");
        _sanitizer.AllowedSchemes.Add("https");

        // IFrame için köken kısıtlaması (Sadece YouTube ve Vimeo)
        _sanitizer.FilterUrl += (s, e) => 
        {
            if (e.Tag?.TagName?.ToLower() == "iframe")
            {
                var url = e.OriginalUrl.ToLower();
                bool isSafe = url.Contains("youtube.com/embed/") || 
                              url.Contains("youtu.be/") || 
                              url.Contains("player.vimeo.com/video/");
                
                if (!isSafe)
                {
                    e.SanitizedUrl = null; // Geçersiz kıl
                }
            }
            // Image için CDN kısıtlaması ilerde eklenebilir. 
            // Şu an için genel kontrollere (XSS) bırakıyoruz.
        };
    }

    public static string Sanitize(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return string.Empty;
        return _sanitizer.Sanitize(content);
    }
}
