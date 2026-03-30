using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Management.Domain;

public class FAQ : BaseEntity
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Category { get; set; } // Örn: Ödemeler, Yazarlık vb.
}
