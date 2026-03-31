using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;

namespace Epiknovel.Modules.Management;

public static class ManagementModuleExtensions
{
    public static IServiceCollection AddManagementModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ManagementDbContext>(options =>
            options.UseNpgsql(connectionString, x => x.MigrationsHistoryTable("__EFMigrationsHistory", "management")));

        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Management.ISystemSettingProvider, Services.SystemSettingProvider>();
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Management.IEmailTemplateService, Services.EmailTemplateService>();
        services.AddHostedService<Workers.OutboxWorker>();

        return services;
    }

    public static async Task SeedTemplatesAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ManagementDbContext>();

        if (!await context.EmailTemplates.AnyAsync())
        {
            context.EmailTemplates.AddRange(
                new Domain.EmailTemplate 
                { 
                    Id = Guid.NewGuid(),
                    Name = "Hoş Geldin E-postası",
                    Key = "WelcomeEmail",
                    Subject = "Epiknovel'e Hoş Geldin {UserName}!",
                    Body = "<h1>Merhaba {UserName},</h1><p>Epiknovel ailesine katıldığın için çok mutluyuz. Binlerce hikaye seni bekliyor!</p>",
                    Variables = "{UserName}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Domain.EmailTemplate 
                { 
                    Id = Guid.NewGuid(),
                    Name = "Şifre Sıfırlama",
                    Key = "PasswordReset",
                    Subject = "Şifre Sıfırlama İsteği",
                    Body = "<h1>Şifreni mi unuttun {UserName}?</h1><p>Aşağıdaki bağlantıyı kullanarak şifreni sıfırlayabilirsin:</p><a href='{ResetLink}'>Şifremi Sıfırla</a>",
                    Variables = "{UserName},{ResetLink}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();
        }
    }
}
