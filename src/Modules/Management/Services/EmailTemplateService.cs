using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Interfaces.Management;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Management.Services;

public class EmailTemplateService(
    ManagementDbContext dbContext, 
    ISystemSettingProvider settingProvider,
    IConfiguration configuration,
    ILogger<EmailTemplateService> logger) : IEmailTemplateService
{
    public async Task<string> RenderTemplateAsync(string key, Dictionary<string, string> variables, CancellationToken ct = default)
    {
        var result = await GetRenderedEmailAsync(key, variables, ct);
        return result.Body;
    }

    public async Task<(string Subject, string Body)> GetRenderedEmailAsync(string key, Dictionary<string, string> variables, CancellationToken ct = default)
    {
        string subject;
        string body;

        var template = await dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == key, ct);

        if (template == null)
        {
            // 🔄 Veritabanında yoksa varsayılanlardan (Hardcoded) al
            if (DefaultTemplates.Templates.TryGetValue(key, out var defaultTpl))
            {
                subject = defaultTpl.Subject;
                body = defaultTpl.Body;
                logger.LogInformation($"Email template with key '{key}' not found in DB. Using hardcoded default.");
            }
            else
            {
                logger.LogWarning($"Email template with key '{key}' not found in DB or Defaults.");
                subject = "Epiknovel Bildirimi";
                body = "Hesabınızla ilgili bir bildirim gönderildi. Lütfen detaylar için portala göz atın.";
            }
        }
        else
        {
            subject = template.Subject;
            body = template.Body;
        }

        // Global Değişkenleri Ekle
        var envMailBaseUrl = configuration["MAIL_BASE_URL"];
        var configuredSiteUrl = await settingProvider.GetSettingValueAsync("SITE_Url", ct);
        var siteUrl = !string.IsNullOrWhiteSpace(envMailBaseUrl)
            ? envMailBaseUrl
            : !string.IsNullOrWhiteSpace(configuredSiteUrl)
                ? configuredSiteUrl
                : "https://epiknovel.com";
        siteUrl = siteUrl.TrimEnd('/');
        if (!variables.ContainsKey("{SiteUrl}"))
        {
            variables["{SiteUrl}"] = siteUrl;
        }

        // Değişkenleri yerleştir
        foreach (var variable in variables)
        {
            subject = subject.Replace(variable.Key, variable.Value ?? "");
            body = body.Replace(variable.Key, variable.Value ?? "");
        }

        return (subject, body);
    }
}
