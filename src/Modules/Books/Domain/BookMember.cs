using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Books.Domain;

public enum BookMemberRole
{
    Owner,      // Asıl Sahip / Editor-in-chief
    Translator, // Çevirmen
    Editor,     // Editör
    Proofreader // Redaktör
}

public class BookMember : BaseEntity
{
    public Guid BookId { get; set; }
    public virtual Book Book { get; set; } = null!;

    public Guid UserId { get; set; }
    
    public BookMemberRole Role { get; set; } = BookMemberRole.Translator;
    
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Yazarın ismi (denormalize - performans için)
    public string UserDisplayName { get; set; } = string.Empty;
}
