using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Services;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Data.Interceptors;

namespace Epiknovel.Modules.Users;

public static class UsersModuleExtensions
{
    public static IServiceCollection AddUsersModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<UsersDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "users")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(20100, 20605))
                 .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

        // 1. Services Register
        services.AddScoped<IFileUsageProvider, UsersFileUsageProvider>();
        services.AddScoped<IUserSearchProvider, UserSearchProvider>();
        services.AddScoped<IUserProvider, UserProvider>();

        return services;
    }
}
