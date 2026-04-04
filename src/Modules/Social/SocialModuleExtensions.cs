using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;

namespace Epiknovel.Modules.Social;

public static class SocialModuleExtensions
{
    public static IServiceCollection AddSocialModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SocialDbContext>(options =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "social")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(20100, 20605)));

        services.AddScoped<Epiknovel.Shared.Core.Interfaces.IReadingProgressProvider, Services.ReadingProgressProvider>();
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.ILibraryProvider, Services.LibraryProvider>(); // ✨ Bildirimler için eklendi
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Management.IManagementSocialProvider, Services.ManagementSocialProvider>();

        return services;
    }
}
