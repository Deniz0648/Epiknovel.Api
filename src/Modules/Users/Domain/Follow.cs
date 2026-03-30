using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Users.Domain;

public class Follow : BaseEntity
{
    // Kim takip ediyor?
    public Guid FollowerId { get; set; }
    public UserProfile Follower { get; set; } = default!;

    // Kimi takip ediyor?
    public Guid FollowingId { get; set; }
    public UserProfile Following { get; set; } = default!;

    public DateTime FollowedAt { get; set; } = DateTime.UtcNow;
}
