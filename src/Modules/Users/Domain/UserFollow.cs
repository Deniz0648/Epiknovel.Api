using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Domain;

public class UserFollow : BaseEntity, ISoftDelete, IOwnable
{
    // Kim takip ediyor?
    public Guid UserId { get; set; }
    
    // Kimi takip ediyor?
    public Guid FollowedUserId { get; set; }

}
