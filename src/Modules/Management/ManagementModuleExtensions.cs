using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;

namespace Epiknovel.Modules.Management;

public static class ManagementModuleExtensions
{
    public static IServiceCollection AddManagementModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ManagementDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
