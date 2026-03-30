using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class ReviewLike : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // ReviewId ile eşleşir
    public Guid ReviewId { get; set; }

    // UserId ile eşleşir
    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
