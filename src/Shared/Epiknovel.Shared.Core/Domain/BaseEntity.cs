using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Shared.Core.Domain;

public abstract class BaseEntity : ISoftDelete
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }
    public string? ModerationNote { get; set; }

    public virtual void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
        ModerationNote = null;
    }
}
