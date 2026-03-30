using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Infrastructure.Domain;

public class Faq : BaseEntity
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // Örn: Wallet, Books, Authors
    
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
