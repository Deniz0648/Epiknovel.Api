using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class InlineComment : BaseEntity, ISoftDelete, IOwnable
{
    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }
    
    // Books modülündeki ParagraphId veya ChapterId ile eşleşir
    public Guid ParagraphId { get; set; }
    public Guid ChapterId { get; set; }

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
