namespace Epiknovel.Modules.Wallet.Services;

public interface ISystemSettingProvider
{
    Task<decimal> GetAuthorSharePercentageAsync(CancellationToken ct = default);
    Task<decimal> GetCoinToCurrencyRateAsync(CancellationToken ct = default);
}

// TODO: Gerçekte Management modülünden veya Redis'ten okunacak!
public class MockSystemSettingProvider : ISystemSettingProvider
{
    public Task<decimal> GetAuthorSharePercentageAsync(CancellationToken ct = default)
    {
        return Task.FromResult(0.50m); // %50 yazar payı
    }

    public Task<decimal> GetCoinToCurrencyRateAsync(CancellationToken ct = default)
    {
        return Task.FromResult(0.15m); // 1 Coin = 0.15 TL
    }
}
