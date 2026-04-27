using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class Review : BaseEntity, ISoftDelete, IOwnable
{
    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }
    
    // Books modülündeki BookId ile eşleşir
    public Guid BookId { get; set; }

    public string Content { get; set; } = string.Empty;
    public double Rating { get; set; } // Örn: 1-5 arası puan
    
    // Denormalize (Cache) Veriler
    public int LikeCount { get; set; }
    public bool IsEditorChoice { get; set; }

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
