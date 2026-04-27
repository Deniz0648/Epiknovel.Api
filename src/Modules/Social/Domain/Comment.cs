using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class Comment : BaseEntity, ISoftDelete, IOwnable
{
    public Guid UserId { get; set; }
    
    // Yorumun nereye yapıldığını belirtir (Biri dolu olmalı)
    public Guid? BookId { get; set; }
    public Guid? ChapterId { get; set; }
    
    // Üst yorum (Eğer yanıtsa)
    public Guid? ParentCommentId { get; set; }
    public string? ParagraphId { get; set; } // Satır seviyesi yorumlar için

    public string Content { get; set; } = string.Empty;
    public string? ContentHash { get; set; } // Spam kontrolü için
    
    public int LikeCount { get; set; }
    public int ReplyCount { get; set; } // Hızlı listeleme için

    public bool IsHidden { get; set; }
    public bool IsSpoiler { get; set; }
    public bool IsPinned { get; set; }
    public bool IsEditorChoice { get; set; }
    public bool IsAuthorComment { get; set; } // Yazar rozeti için
    public bool IsEdited { get; set; }

    public override void UndoDelete()
    {
        base.UndoDelete();
        IsHidden = false;
    }

    // IOwnable Implementation
    public Guid OwnerId => UserId;
}
