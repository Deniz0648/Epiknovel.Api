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

    public string Content { get; set; } = string.Empty;
    public int LikeCount { get; set; }

    // ISoftDelete Implementation
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
