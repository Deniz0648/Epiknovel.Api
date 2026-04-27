using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Social.Domain;

/// <summary>
/// Yorumlar içindeki @mention etiketlerini takip eden ara tablo.
/// Kullanıcı adı değişse bile linklerin kırılmamasını ve bildirimlerin doğru takibini sağlar.
/// </summary>
public class CommentMention : BaseEntity
{
    public Guid CommentId { get; set; }
    public Guid MentionedUserId { get; set; }

    // Navigation Properties
    public virtual Comment Comment { get; set; } = null!;
}
