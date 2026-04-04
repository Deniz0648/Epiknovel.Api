using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Modules.Compliance.Services;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Compliance;

public static class ComplianceModuleExtensions
{
    public static IServiceCollection AddComplianceModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ComplianceDbContext>(options =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "compliance")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(20100, 20605)));

        // 1. Services Register
        services.AddScoped<IFileUsageProvider, ComplianceFileUsageProvider>();

        return services;
    }
}
