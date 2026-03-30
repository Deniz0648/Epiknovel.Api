using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Domain;

public enum AuthorRole
{
    MainAuthor,
    CoAuthor,
    Translator,
    Editor
}

public class BookAuthor : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid BookId { get; set; }
    public virtual Book Book { get; set; } = null!;

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }
    
    public AuthorRole Role { get; set; } = AuthorRole.MainAuthor;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
