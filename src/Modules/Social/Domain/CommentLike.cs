using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class CommentLike : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // InlineCommentId ile eşleşir
    public Guid CommentId { get; set; }

    // UserId ile eşleşir
    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
