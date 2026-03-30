using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Modules.Infrastructure.Workers;
using Epiknovel.Modules.Infrastructure.Services;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Infrastructure;

public static class InfrastructureModuleExtensions
{
    public static IServiceCollection AddInfrastructureModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<InfrastructureDbContext>(options =>
            options.UseNpgsql(connectionString));

        // 1. Bildirim Servisi
        services.AddScoped<INotificationService, NotificationService>();

        // Arka Plan Temizlik Servisi
        services.AddHostedService<OrphanFileCleanupWorker>();

        return services;
    }
}
