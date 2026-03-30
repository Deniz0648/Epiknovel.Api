using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Search.Domain;

public class SearchHistory : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Identity modülündeki UserId ile eşleşir (Kaydı yapan kullanıcı)
    public Guid UserId { get; set; }

    public string Query { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    
    public int ResultCount { get; set; }
}
