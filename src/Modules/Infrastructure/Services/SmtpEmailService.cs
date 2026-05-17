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
            // Standart SMTP Ayarlarını Çek
            var host = await GetSettingOrEnvAsync("SMTP_Host", "SMTP_HOST", "localhost");
            var portStr = await GetSettingOrEnvAsync("SMTP_Port", "SMTP_PORT", "587");
            var port = int.TryParse(portStr, out var p) ? p : 587;
            
            var userName = await GetSettingOrEnvAsync("SMTP_Username", "SMTP_USERNAME", null);
            var password = await GetSettingOrEnvAsync("SMTP_Password", "SMTP_PASSWORD", null);
            var fromEmail = await GetSettingOrEnvAsync("SMTP_FromEmail", "SMTP_FROM_EMAIL", "no-reply@epiknovel.com") 
                ?? "no-reply@epiknovel.com";
            var fromName = await GetSettingOrEnvAsync("SMTP_FromName", "SMTP_FROM_NAME", "Epiknovel");
            
            var sslStr = await GetSettingOrEnvAsync("SMTP_EnableSsl", "SMTP_ENABLE_SSL", "true");
            // Port 587 ise SSL her zaman true olmalı (Gmail vb. için zorunlu)
            var enableSsl = (sslStr?.ToLower() == "true") || (port == 587);

            // Eğer ayarlar boşsa (Yeni kurulum), Console üzerinden log bas (Failsafe)
            if (string.IsNullOrEmpty(userName) || string.IsNullOrEmpty(password))
            {
                logger.LogError("SMTP settings are not configured (username/password missing). Mail send aborted.");
                throw new InvalidOperationException("SMTP credentials are missing.");
            }

            logger.LogInformation($"[SMTP] Attempting to send email to {to} via {host}:{port} (SSL: {enableSsl})");

            using var client = new SmtpClient(host, port)
            {
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(userName, password),
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 20000 // 20 saniye timeout
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
            logger.LogInformation($"[SMTP] Email successfully sent to {to}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"Failed to send email to {to}");
            throw; // Üst katmanda (Outbox vb.) işlenmesi için fırlat
        }
    }
    
    private async Task<string?> GetSettingOrEnvAsync(string dbKey, string envKey, string? defaultValue, CancellationToken ct = default)
    {
        var dbValue = await settingProvider.GetSettingValueAsync(dbKey, ct);
        if (!string.IsNullOrEmpty(dbValue)) return dbValue;

        var envValue = Environment.GetEnvironmentVariable(envKey);
        if (!string.IsNullOrEmpty(envValue)) return envValue;

        return defaultValue;
    }
}
