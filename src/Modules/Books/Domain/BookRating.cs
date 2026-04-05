using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Domain;

public class BookRating : BaseEntity, ISoftDelete
{
    public Guid BookId { get; set; }
    public Guid UserId { get; set; }
    public int Value { get; set; } // 1-5 arası puan
    
    // Navigasyon
    public virtual Book Book { get; set; } = null!;
}
