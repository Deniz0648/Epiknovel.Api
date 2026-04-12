using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Data.Interceptors;

namespace Epiknovel.Modules.Management;

public static class ManagementModuleExtensions
{
    public static IServiceCollection AddManagementModule(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<ManagementDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "management")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(20100, 20605))
                 .AddInterceptors(sp.GetRequiredService<AuditInterceptor>())
                 .AddInterceptors(sp.GetRequiredService<SoftDeleteInterceptor>()));

        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Management.ISystemSettingProvider, Services.SystemSettingProvider>();
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Management.IEmailTemplateService, Services.EmailTemplateService>();
        services.AddScoped<IAuthorApplicationService, Services.AuthorApplicationService>();
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

    public static async Task SeedSettingsAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ManagementDbContext>();

        var defaultSettings = new List<Domain.SystemSetting>
        {
            // 🌐 SITE AYARLARI
            new() { Key = Shared.Core.Constants.SettingKeys.Site.Name, Value = "Epiknovel", Description = "Platform adı.", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.Slogan, Value = "En Epik Hikayeler Burada", Description = "Platform sloganı.", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.LogoUrl, Value = "/images/logo.png", Description = "Ana logo (Geniş).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.FaviconUrl, Value = "/favicon.ico", Description = "Site ikonu (32x32).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.SupportEmail, Value = "destek@epiknovel.com", Description = "Müşteri destek e-postası.", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.MaintenanceMode, Value = "false", Description = "Bakım modu (true/false).", UpdatedAt = DateTime.UtcNow },

            // 🎁 ÖDÜL SİSTEMİ
            new() { Key = Shared.Core.Constants.SettingKeys.Rewards.EnableRewards, Value = "true", Description = "Ödül sistemini aktif/pasif yapar.", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Rewards.DailyLoginReward, Value = "5", Description = "Günlük giriş ödülü (Jeton).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Rewards.ReferralReward, Value = "50", Description = "Referans ödülü (Jeton).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Rewards.FirstRegistrationBonus, Value = "100", Description = "İlk kayıt bonusu (Jeton).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Rewards.CommentReward, Value = "2", Description = "Yorum yazma ödülü (Jeton).", UpdatedAt = DateTime.UtcNow },

            // 📚 İÇERİK VE EKONOMİ AYARLARI
            new() { Key = "CONTENT_AllowNewBooks", Value = "true", Description = "Yeni kitap oluşturulmasını açar/kapatır.", UpdatedAt = DateTime.UtcNow },
            new() { Key = "CONTENT_AllowPaidChapters", Value = "true", Description = "Ücretli bölüm oluşturulmasını yönetir.", UpdatedAt = DateTime.UtcNow },
            new() { Key = "CONTENT_EnableWallet", Value = "true", Description = "Cüzdan ve satın alma işlemlerini yönetir.", UpdatedAt = DateTime.UtcNow },
            new() { Key = "Economy_EnablePurchasing", Value = "true", Description = "Paket satın alımlarını yönetir.", UpdatedAt = DateTime.UtcNow },
            new() { Key = "CONTENT_AllowAuthorApplications", Value = "true", Description = "Yazarlık başvurularını yönetir.", UpdatedAt = DateTime.UtcNow },

            // 💳 IYZICO AYARLARI
            new() { Key = "POS_Iyzico_ApiKey", Value = "sandbox-xxxx", Description = "Iyzico Api Key.", UpdatedAt = DateTime.UtcNow },
            new() { Key = "POS_Iyzico_SecretKey", Value = "sandbox-xxxx", Description = "Iyzico Secret Key.", UpdatedAt = DateTime.UtcNow },
            new() { Key = "POS_Iyzico_BaseUrl", Value = "https://sandbox-api.iyzipay.com", Description = "Iyzico API Base URL.", UpdatedAt = DateTime.UtcNow }
        };

        foreach (var ds in defaultSettings)
        {
            if (!await context.SystemSettings.AnyAsync(s => s.Key == ds.Key))
            {
                context.SystemSettings.Add(ds);
            }
        }

        if (context.ChangeTracker.HasChanges())
        {
            await context.SaveChangesAsync();
        }
    }
}
