using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Endpoints.AddChapter;

public class Request : IOwnable
{
    public Guid UserId { get; set; } // IOwnable: BOLAValidationPreProcessor (Token üzerinden)
    
    public Guid BookId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsFree { get; set; }
    public int Price { get; set; }
    
    public bool IsTitleSpoiler { get; set; }
    public ChapterStatus Status { get; set; } = ChapterStatus.Published;
    public DateTime? ScheduledPublishDate { get; set; }

    /// <summary>
    /// Bölüm içeriği. Her bir eleman bir Paragraph (satır) oluşturur.
    /// </summary>
    public List<LineItem> Lines { get; set; } = new();
}

public class LineItem
{
    public string Content { get; set; } = string.Empty;
    public ParagraphType Type { get; set; } = ParagraphType.Text;
}

public class Response 
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
