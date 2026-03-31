using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Domain;

public class Category : BaseEntity, ISoftDelete, ISlugified
{
    public string Name { get; set; } = string.Empty;
    public string Title => Name;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public int DisplayOrder { get; set; }

    public virtual ICollection<Book> Books { get; set; } = new List<Book>();
}
