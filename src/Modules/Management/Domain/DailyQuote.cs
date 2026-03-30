using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Management.Domain;

public class DailyQuote : BaseEntity
{
    public string Content { get; set; } = string.Empty;
    public string AuthorName { get; set; } = "Anonim";
    public bool IsActive { get; set; } = true;
    public DateTime? PublishDate { get; set; }
}
