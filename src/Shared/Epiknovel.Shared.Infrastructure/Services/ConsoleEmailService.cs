using Epiknovel.Shared.Core.Services;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Epiknovel.Shared.Infrastructure.Services;

public class ConsoleEmailService(ILogger<ConsoleEmailService> logger) : IEmailService
{
    public Task SendEmailAsync(string to, string subject, string body)
    {
        logger.LogInformation("================ EMAIL SENT ================");
        logger.LogInformation("To: {To}", to);
        logger.LogInformation("Subject: {Subject}", subject);
        logger.LogInformation("Body: {Body}", body);
        logger.LogInformation("============================================");
        
        return Task.CompletedTask;
    }
}
