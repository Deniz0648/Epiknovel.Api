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

    public bool IsHidden { get; set; }
    public bool IsSpoiler { get; set; }

    public override void UndoDelete()
    {
        base.UndoDelete();
        IsHidden = false;
    }

    // IOwnable Implementation
    public Guid OwnerId => UserId;
}
