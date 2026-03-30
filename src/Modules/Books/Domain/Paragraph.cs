using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Domain;

public enum ParagraphType
{
    Text,
    Image
}

public class Paragraph : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChapterId { get; set; }
    public virtual Chapter Chapter { get; set; } = null!;

    public Guid UserId { get; set; } // Author veya Editor
    
    /// <summary>
    /// Type Text ise düz metin, Image ise S3 URL/Key tutar.
    /// </summary>
    public string Content { get; set; } = string.Empty;
    public ParagraphType Type { get; set; } = ParagraphType.Text;
    
    public int Order { get; set; } // Bölüm içindeki sırası

    // İleride Social modülündeki InlineComment'ler buraya Id bazlı bağlanacak.
}
