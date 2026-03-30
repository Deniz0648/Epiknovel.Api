namespace Epiknovel.Modules.Management.Domain;

public class SystemSetting
{
    public string Key { get; set; } = string.Empty; // Örn: MinPayoutAmount, CoinToCurrencyRate
    public string Value { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; set; }
}
