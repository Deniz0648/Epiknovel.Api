using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;

namespace Epiknovel.Modules.Social;

public static class SocialModuleExtensions
{
    public static IServiceCollection AddSocialModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SocialDbContext>(options =>
            options.UseNpgsql(connectionString));

        return services;
    }
}
