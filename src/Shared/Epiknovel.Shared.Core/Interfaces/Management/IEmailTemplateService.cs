namespace Epiknovel.Shared.Core.Interfaces.Management;

public interface IEmailTemplateService
{
    Task<string> RenderTemplateAsync(string key, Dictionary<string, string> variables, CancellationToken ct = default);
    Task<(string Subject, string Body)> GetRenderedEmailAsync(string key, Dictionary<string, string> variables, CancellationToken ct = default);
}
