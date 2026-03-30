using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Services;
using Epiknovel.Shared.Core.Interfaces.Wallet;

namespace Epiknovel.Modules.Wallet;

public static class WalletModuleExtensions
{
    public static IServiceCollection AddWalletModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<WalletDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IWalletProvider, WalletProvider>();
        services.AddScoped<IIyzicoService, IyzicoService>();
        services.AddScoped<ISystemSettingProvider, MockSystemSettingProvider>();

        return services;
    }
}
