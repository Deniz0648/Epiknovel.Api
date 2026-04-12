namespace Epiknovel.Modules.Wallet.Services;

public interface ISystemSettingProvider
{
    Task<decimal> GetAuthorSharePercentageAsync(CancellationToken ct = default);
    Task<decimal> GetCoinToCurrencyRateAsync(CancellationToken ct = default);
    Task<bool> IsWalletEnabledAsync(CancellationToken ct = default);
    Task<bool> IsPurchasingEnabledAsync(CancellationToken ct = default);
}

public class WalletSystemSettingProvider(
    Epiknovel.Shared.Core.Interfaces.Management.ISystemSettingProvider globalSettings) : ISystemSettingProvider
{
    public async Task<decimal> GetAuthorSharePercentageAsync(CancellationToken ct = default)
    {
        var value = await globalSettings.GetSettingValueAsync<string>("ECONOMY_AuthorSharePercentage", ct);
        return decimal.TryParse(value, out var result) ? result / 100m : 0.50m;
    }

    public async Task<decimal> GetCoinToCurrencyRateAsync(CancellationToken ct = default)
    {
        var value = await globalSettings.GetSettingValueAsync<string>("ECONOMY_CoinToCurrencyRate", ct);
        return decimal.TryParse(value, out var result) ? result : 0.15m;
    }

    public async Task<bool> IsWalletEnabledAsync(CancellationToken ct = default)
    {
        return await globalSettings.GetSettingValueAsync<bool>("CONTENT_EnableWallet", ct);
    }

    public async Task<bool> IsPurchasingEnabledAsync(CancellationToken ct = default)
    {
        return await globalSettings.GetSettingValueAsync<bool>("Economy_EnablePurchasing", ct);
    }
}
