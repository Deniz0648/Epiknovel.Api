using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Search.Data;
using Epiknovel.Shared.Infrastructure.Data.Interceptors;

namespace Epiknovel.Modules.Search;

public static class SearchModuleExtensions
{
    public static IServiceCollection AddSearchModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SearchDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "search")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                 .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

        return services;
    }
}
