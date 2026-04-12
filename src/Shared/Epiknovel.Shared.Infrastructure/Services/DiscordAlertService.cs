using Epiknovel.Shared.Core.Interfaces;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

namespace Epiknovel.Shared.Infrastructure.Services;

public class DiscordAlertService(ILogger<DiscordAlertService> logger, IHttpClientFactory httpClientFactory) : IDiscordAlertService
{
    public async Task SendUrgentAlertAsync(string message, string? source = null, CancellationToken ct = default)
    {
        // Environment'den Discord Webhook URL'sini alacağız
        var webhookUrl = Environment.GetEnvironmentVariable("DISCORD_WEBHOOK_URL");
        
        if (string.IsNullOrEmpty(webhookUrl))
        {
            logger.LogWarning("⚠️ DISCORD_WEBHOOK_URL is not configured. Falling back to local logging. Alert: {Message}", message);
            return;
        }

        try
        {
            var httpClient = httpClientFactory.CreateClient();
            var payload = new
            {
                content = $"🚨 **ACİL MÜDAHALE GEREKLİ** 🚨\n**Kaynak:** `{source ?? "Bilinmiyor"}`\n**Mesaj:** {message}"
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(webhookUrl, content, ct);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Discord webhook gönderimi başarısız oldu. StatusCode: {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Discord'a acil durum uyarısı gönderilirken hata oluştu.");
        }
    }
}
