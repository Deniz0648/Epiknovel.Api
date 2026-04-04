using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Modules.Infrastructure.Workers;
using Epiknovel.Modules.Infrastructure.Services;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Services;

namespace Epiknovel.Modules.Infrastructure;

public static class InfrastructureModuleExtensions
{
    public static IServiceCollection AddInfrastructureModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<InfrastructureDbContext>(options =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "infrastructure")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(20100, 20605)));

        // 1. Bildirim Servisi
        services.AddScoped<IEmailService, SmtpEmailService>();
        services.AddScoped<INotificationService, NotificationService>();

        // Arka Plan Bakım Servisleri
        services.AddHostedService<OrphanFileCleanupWorker>();
        // services.AddHostedService<DataRetentionWorker>(); // Partitioning kaldırıldı

        return services;
    }
}
