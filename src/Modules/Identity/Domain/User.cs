using Microsoft.AspNetCore.Identity;
using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Identity.Domain;

public class User : IdentityUser<Guid>, ISoftDelete, IOwnable
{
    // IOwnable ve IBaseEntity için Id mapping
    public Guid UserId { get => Id; set => Id = value; }

    public string DisplayName { get; set; } = string.Empty;
    public bool IsBanned { get; set; }
    public DateTime? BannedUntil { get; set; }
    public string? BanReason { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // ISoftDelete Implementation
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }
    public string? ModerationNote { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
        ModerationNote = null;
    }
}
