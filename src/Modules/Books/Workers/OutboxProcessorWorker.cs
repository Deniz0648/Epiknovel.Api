using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Threading.Channels;
using Npgsql;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Workers;

/// <summary>
/// PostgreSQL LISTEN/NOTIFY özelliğini kullanarak Outbox mesajlarını 
/// gerçek zamanlı (event-driven) işleyen optimize edilmiş worker.
/// Polling yükünü azaltırken tepki süresini milisaniye seviyesine indirir.
/// </summary>
public class OutboxProcessorWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OutboxProcessorWorker> _logger;
    private readonly string _connectionString;
    private readonly Channel<bool> _signal = Channel.CreateUnbounded<bool>();

    public OutboxProcessorWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<OutboxProcessorWorker> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        // Shared Infrastructure içindeki standart DB_CONNECTION kullanılır
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
                          ?? configuration["DB_CONNECTION"] 
                          ?? string.Empty;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrEmpty(_connectionString))
        {
            _logger.LogCritical("Outbox Worker başlatılamadı: Connection string eksik.");
            return;
        }

        _logger.LogInformation("Outbox Processor (LISTEN/NOTIFY) başlatıldı.");

        // 1. Dinleyici Döngüsü (NOTIFY dinler)
        _ = RunNotificationListenerAsync(stoppingToken);

        // 2. Safety Fallback Döngüsü (Her 2 dk'da bir kontrol eder - Bildirim kaçarsa)
        _ = RunFallbackTimerAsync(stoppingToken);

        // 3. Ana İşleme Döngüsü (Sinyalleri bekler ve işler)
        try
        {
            while (await _signal.Reader.WaitToReadAsync(stoppingToken))
            {
                while (_signal.Reader.TryRead(out _))
                {
                    // Sinyal geldi, mesajları işle
                    await ProcessOutboxMessagesAsync(stoppingToken);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Outbox ana işleme döngüsü çöktü.");
        }
    }

    private async Task RunNotificationListenerAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync(ct);

                // NOTIFY kanalına abone ol
                using (var cmd = new NpgsqlCommand("LISTEN outbox_inserted;", conn))
                {
                    await cmd.ExecuteNonQueryAsync(ct);
                }

                _logger.LogInformation("PostgreSQL LISTEN 'outbox_inserted' aktif.");

                // İlk başlatıldığında bir kez tara (önceden kalanlar için)
                _signal.Writer.TryWrite(true);

                while (!ct.IsCancellationRequested)
                {
                    // Bildirim gelene kadar CPU tüketmeden bekle
                    await conn.WaitAsync(ct);
                    _signal.Writer.TryWrite(true);
                }
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning("Outbox dinleyici bağlantısı koptu, 5sn içinde tekrar denenecek. Hata: {Msg}", ex.Message);
                await Task.Delay(5000, ct);
            }
        }
    }

    private async Task RunFallbackTimerAsync(CancellationToken ct)
    {
        // 2 dakikalık periyotlarla "safety poll" yap
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(2));
        while (await timer.WaitForNextTickAsync(ct))
        {
            _signal.Writer.TryWrite(true);
        }
    }

    private async Task ProcessOutboxMessagesAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<BooksDbContext>();
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            // 1. İşlenmemiş mesajları al (Toplu işleme - en fazla 50 adet)
            var messages = await dbContext.OutboxMessages
                .Where(m => m.ProcessedOnUtc == null && m.RetryCount < 5)
                .OrderBy(m => m.CreatedAt)
                .Take(50)
                .ToListAsync(ct);

            if (messages.Count == 0) return;

            _logger.LogDebug("Outbox: {Count} yeni mesaj işleniyor.", messages.Count);

            foreach (var message in messages)
            {
                try
                {
                    var type = Type.GetType(message.Type);
                    if (type == null)
                    {
                        _logger.LogError("Outbox mesaj tipi bulunamadı: {Type}", message.Type);
                        message.Error = "Type not found";
                        message.ProcessedOnUtc = DateTime.UtcNow;
                        continue;
                    }

                    var @event = JsonSerializer.Deserialize(message.Content, type);
                    if (@event is INotification notification)
                    {
                        await mediator.Publish(notification, ct);
                        message.ProcessedOnUtc = DateTime.UtcNow;
                        message.Error = null;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Outbox mesajı işlenemedi (ID: {Id}).", message.Id);
                    message.RetryCount++;
                    message.Error = ex.Message;
                }
            }

            await dbContext.SaveChangesAsync(ct);

            // Eğer hala bekleyen mesaj varsa sinyal gönder (Hızlı temizleme)
            if (messages.Count == 50)
            {
                _signal.Writer.TryWrite(true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Outbox işleme sırasında hata oluştu.");
        }
    }
}
