using System.Net;
using System.Net.Mail;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Services;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Infrastructure.Services;

public class SmtpEmailService(
    ISystemSettingProvider settingProvider, 
    ILogger<SmtpEmailService> logger) : IEmailService
{
    public async Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        try 
        {
            // Veritabanından SMTP Ayarlarını Çek
            var host = await settingProvider.GetSettingValueAsync("SMTP_Host", ct) ?? "localhost";
            var port = await settingProvider.GetSettingValueAsync<int>("SMTP_Port", ct);
            if (port == 0) port = 587;
            
            var userName = await settingProvider.GetSettingValueAsync("SMTP_Username", ct);
            var password = await settingProvider.GetSettingValueAsync("SMTP_Password", ct);
            var fromEmail = await settingProvider.GetSettingValueAsync("SMTP_FromEmail", ct) ?? "no-reply@epiknovel.com";
            var fromName = await settingProvider.GetSettingValueAsync("SMTP_FromName", ct) ?? "Epiknovel";
            var enableSsl = await settingProvider.GetSettingValueAsync<bool>("SMTP_EnableSsl", ct);

            // Eğer ayarlar boşsa (Yeni kurulum), Console üzerinden log bas (Failsafe)
            if (string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(password))
            {
                logger.LogWarning("SMTP Settings are not configured. Logging email to console instead.");
                logger.LogInformation($"[SIMULATED EMAIL] To: {to} | Subject: {subject} | Body: {body}");
                return;
            }

            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(userName, password),
                EnableSsl = enableSsl
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            
            mailMessage.To.Add(to);

            await client.SendMailAsync(mailMessage, ct);
            logger.LogInformation($"Email sent successfully to {to}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"Failed to send email to {to}");
            throw; // Üst katmanda (Outbox vb.) işlenmesi için fırlat
        }
    }
}
