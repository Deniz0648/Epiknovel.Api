using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Interfaces.Management;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Management.Services;

public class EmailTemplateService(ManagementDbContext dbContext, ILogger<EmailTemplateService> logger) : IEmailTemplateService
{
    public async Task<string> RenderTemplateAsync(string key, Dictionary<string, string> variables, CancellationToken ct = default)
    {
        var result = await GetRenderedEmailAsync(key, variables, ct);
        return result.Body;
    }

    public async Task<(string Subject, string Body)> GetRenderedEmailAsync(string key, Dictionary<string, string> variables, CancellationToken ct = default)
    {
        var template = await dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == key, ct);

        if (template == null)
        {
            logger.LogWarning($"Email template with key '{key}' not found.");
            return ("Epiknovel Notification", "A notification has been sent regarding your account. Please check the portal for details.");
        }

        string subject = template.Subject;
        string body = template.Body;

        foreach (var variable in variables)
        {
            subject = subject.Replace(variable.Key, variable.Value);
            body = body.Replace(variable.Key, variable.Value);
        }

        return (subject, body);
    }
}
