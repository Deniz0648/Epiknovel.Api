using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Infrastructure.Domain;

public class Announcement : BaseEntity, ISoftDelete
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty; // HTML or MD
    public string? ImageUrl { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool IsPinned { get; set; }
    
    public DateTime? ExpiresAt { get; set; }

    // ISoftDelete Implementation
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
