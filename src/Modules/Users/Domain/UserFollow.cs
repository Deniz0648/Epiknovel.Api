using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Domain;

public class UserFollow : BaseEntity, ISoftDelete, IOwnable
{
    // Kim takip ediyor?
    public Guid UserId { get; set; }
    
    // Kimi takip ediyor?
    public Guid FollowedUserId { get; set; }

    // ISoftDelete Implementation (BaseEntity.IsDeleted kullanılıyor)
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
