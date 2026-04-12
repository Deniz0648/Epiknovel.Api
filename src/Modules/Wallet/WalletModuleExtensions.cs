using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Services;
using Epiknovel.Shared.Core.Interfaces.Wallet;
using Epiknovel.Shared.Infrastructure.Data.Interceptors;
using Epiknovel.Modules.Wallet.Background;

namespace Epiknovel.Modules.Wallet;

public static class WalletModuleExtensions
{
    public static IServiceCollection AddWalletModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<WalletDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "wallet")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                 .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

        services.AddScoped<IWalletProvider, WalletProvider>();
        services.AddScoped<IIyzicoService, IyzicoService>();
        services.AddScoped<ISystemSettingProvider, WalletSystemSettingProvider>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddHostedService<PopularityCalculatorWorker>();
        services.AddHostedService<PaymentReconciliationWorker>();

        return services;
    }
}
