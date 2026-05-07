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
                 .ConfigureWarnings(w => w.Ignore(20100, 20605, Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
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

        // 🗑️ Eski/Mükerrer şablonları temizle (Legacy/Duplicate Keys)
        var legacyKeys = new[] { 
            "YazarBasvurusuOnayi", "YazarBasvurusuReddi", "HosGeldinEPostasi", 
            "YeniBolumBildirimi", "YeniIncelemeBildirimi", "YeniYorumBildirimi", 
            "FaturaHazir", "UcretliYazarOnay", "UcretliYazarRed", "SifreSifirla",
            "YENI_TAKIPCI", "EP_DOGRULAMA", "EP_DEGISTIRME", "SIPARIS_ONAY",
            "UcretliOnay", "UcretliRed", "YazarOnay", "YazarRed", "HosGeldin", "Fatura"
        };
        
        // Key bazlı temizlik + Default listesindeki isimlerle çakışan farklı keyleri temizle
        var defaultNames = Domain.DefaultTemplates.Templates.Values.Select(v => v.Name).ToList();
        var defaultKeys = Domain.DefaultTemplates.Templates.Keys.ToList();
        
        var toDelete = await context.EmailTemplates
            .Where(t => legacyKeys.Contains(t.Key) || 
                       (defaultNames.Contains(t.Name) && !defaultKeys.Contains(t.Key)))
            .ToListAsync();
            
        if (toDelete.Count > 0)
        {
            context.EmailTemplates.RemoveRange(toDelete);
        }

        foreach (var tpl in Domain.DefaultTemplates.Templates)
        {
            var existing = await context.EmailTemplates.FirstOrDefaultAsync(t => t.Key == tpl.Key);
            if (existing == null)
            {
                context.EmailTemplates.Add(new Domain.EmailTemplate
                {
                    Id = Guid.NewGuid(),
                    Key = tpl.Key,
                    Name = tpl.Value.Name,
                    Subject = tpl.Value.Subject,
                    Body = tpl.Value.Body,
                    Variables = tpl.Value.Variables,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else if (existing.Name != tpl.Value.Name)
            {
                // 🔄 Başlıklar güncellendiği için senkronize et
                existing.Name = tpl.Value.Name;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (context.ChangeTracker.HasChanges())
        {
            await context.SaveChangesAsync();
        }
    }

    public static async Task SeedSettingsAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ManagementDbContext>();

        // 🧹 Mükerrer/Eski SMTP Anahtarlarını Temizle ve Veriyi Taşı
        var legacySmtpMap = new Dictionary<string, string>
        {
            { "SMTP_User", "SMTP_Username" },
            { "SMTP_Pass", "SMTP_Password" },
            { "SMTP_SenderEmail", "SMTP_FromEmail" },
            { "SMTP_SenderName", "SMTP_FromName" }
        };

        foreach (var legacy in legacySmtpMap)
        {
            var oldSetting = await context.SystemSettings.FirstOrDefaultAsync(s => s.Key == legacy.Key);
            if (oldSetting != null)
            {
                // Eğer ana hedef (Username vb.) boşsa, eski veriyi oraya taşı
                var targetSetting = await context.SystemSettings.FirstOrDefaultAsync(s => s.Key == legacy.Value);
                if (targetSetting != null && (string.IsNullOrEmpty(targetSetting.Value) || targetSetting.Value == "user@example.com"))
                {
                    targetSetting.Value = oldSetting.Value;
                    targetSetting.UpdatedAt = DateTime.UtcNow;
                }
                
                // Eski anahtarı sil
                context.SystemSettings.Remove(oldSetting);
            }
        }

        var defaultSettings = new List<Domain.SystemSetting>
        {
            // 🌐 SITE AYARLARI
            new() { Key = Shared.Core.Constants.SettingKeys.Site.Name, Value = "Epiknovel", Description = "Platform adı.", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.Slogan, Value = "En Epik Hikayeler Burada", Description = "Platform sloganı.", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.LogoUrl, Value = "/images/logo.png", Description = "Ana logo (Geniş).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.FaviconUrl, Value = "/favicon.ico", Description = "Site ikonu (32x32).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.SupportEmail, Value = "destek@epiknovel.com", Description = "Müşteri destek e-postası.", UpdatedAt = DateTime.UtcNow },
            new() { Key = "SITE_Url", Value = "https://epiknovel.com", Description = "Platformun ana URL adresi (E-postalar için).", UpdatedAt = DateTime.UtcNow },
            new() { Key = Shared.Core.Constants.SettingKeys.Site.MaintenanceMode, Value = "false", Description = "Bakım modu (true/false).", UpdatedAt = DateTime.UtcNow },

            // 📧 SMTP AYARLARI (STANDART)
            new() { Key = "SMTP_Host", Value = "smtp.gmail.com", Description = "SMTP Sunucusu", UpdatedAt = DateTime.UtcNow },
            new() { Key = "SMTP_Port", Value = "587", Description = "SMTP Portu", UpdatedAt = DateTime.UtcNow },
            new() { Key = "SMTP_Username", Value = "user@example.com", Description = "SMTP Kullanıcı Adı", UpdatedAt = DateTime.UtcNow },
            new() { Key = "SMTP_Password", Value = "password", Description = "SMTP Şifresi", UpdatedAt = DateTime.UtcNow },
            new() { Key = "SMTP_FromEmail", Value = "no-reply@epiknovel.com", Description = "Gönderen E-posta", UpdatedAt = DateTime.UtcNow },
            new() { Key = "SMTP_FromName", Value = "Epiknovel", Description = "Gönderen Adı", UpdatedAt = DateTime.UtcNow },
            new() { Key = "SMTP_EnableSsl", Value = "true", Description = "SSL Aktif mi?", UpdatedAt = DateTime.UtcNow }
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
