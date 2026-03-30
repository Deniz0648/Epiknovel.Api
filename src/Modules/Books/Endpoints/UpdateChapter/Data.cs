using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Endpoints.UpdateChapter;

public class Request : IOwnable
{
    public Guid UserId { get; set; } // IOwnable: BOLAValidationPreProcessor
    
    public Guid ChapterId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsFree { get; set; }
    public int Price { get; set; }
    
    /// <summary>
    /// Güncellenmiş satır listesi. 
    /// Eğer mevcut bir Id gönderilirse o satır GÜNCELLENİR. 
    /// Id boş ise YENİ satır oluşturulur. 
    /// Eski listede olup yeni listede olmayanlar SİLİNİR.
    /// </summary>
    public List<UpdateLineItem> Lines { get; set; } = new();
}

public class UpdateLineItem
{
    public Guid? Id { get; set; } // Mevcut ise güncelle, null ise ekle
    public string Content { get; set; } = string.Empty;
    public ParagraphType Type { get; set; } = ParagraphType.Text;
}

public class Response 
{
    public string Message { get; set; } = string.Empty;
}
