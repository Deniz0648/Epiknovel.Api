using System.Text.Json;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Commands.Wallet;
using Epiknovel.Shared.Core.Commands.Books;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Management.Workers;

public class OutboxWorker(
    IServiceProvider serviceProvider,
    IConfiguration configuration,
    ILogger<OutboxWorker> logger) : BackgroundService
{
    private const int DefaultBatchSize = 50;
    private static readonly TimeSpan DefaultPollInterval = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan BusyLoopPause = TimeSpan.FromMilliseconds(50);

    private readonly int _batchSize = Math.Clamp(configuration.GetValue("MANAGEMENT_OUTBOX_BATCH_SIZE", DefaultBatchSize), 1, 500);
    private readonly TimeSpan _pollInterval = TimeSpan.FromMilliseconds(
        Math.Max(100, configuration.GetValue("MANAGEMENT_OUTBOX_POLL_MS", (int)DefaultPollInterval.TotalMilliseconds)));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "Outbox Worker starting (BatchSize: {BatchSize}, PollMs: {PollMs})",
            _batchSize,
            (int)_pollInterval.TotalMilliseconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            var processedCount = 0;
            try
            {
                processedCount = await ProcessOutboxAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred during outbox processing");
            }

            var delay = processedCount >= _batchSize ? BusyLoopPause : _pollInterval;
            await Task.Delay(delay, stoppingToken);
        }
    }

    private async Task<int> ProcessOutboxAsync(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ManagementDbContext>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        // 🛡️ Connection Resiliency: Retry strategy ile uyumlu transaction yönetimi
        var strategy = dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await dbContext.Database.BeginTransactionAsync(ct);

            var messages = await dbContext.OutboxMessages
                .FromSqlInterpolated($@"
                    SELECT *
                    FROM management.""OutboxMessages""
                    WHERE ""ProcessedAtUtc"" IS NULL
                      AND ""RetryCount"" < 5
                    ORDER BY ""CreatedAt""
                    LIMIT {_batchSize}
                    FOR UPDATE SKIP LOCKED")
                .ToListAsync(ct);

            if (messages.Count == 0)
            {
                await tx.CommitAsync(ct);
                return 0;
            }

            foreach (var message in messages)
            {
                try
                {
                    logger.LogInformation("Processing outbox message {Id} of type {Type}", message.Id, message.Type);

                    if (message.Type == nameof(DeductBalanceForPayoutCommand))
                    {
                        var command = JsonSerializer.Deserialize<DeductBalanceForPayoutCommand>(message.Content);
                        if (command != null)
                        {
                            var result = await mediator.Send(command, ct);
                            if (!result.IsSuccess) throw new Exception(result.Message);

                            var payout = await dbContext.PayoutRequests.FirstOrDefaultAsync(p => p.Id == command.PayoutRequestId, ct);
                            if (payout != null)
                            {
                                payout.Status = PayoutStatus.Completed;
                                payout.ProcessedAt = DateTime.UtcNow;
                            }
                        }
                    }

                    if (message.Type == nameof(SyncDiscountsCommand))
                    {
                        var command = JsonSerializer.Deserialize<SyncDiscountsCommand>(message.Content);
                        if (command != null)
                        {
                            var result = await mediator.Send(command, ct);
                            if (!result.IsSuccess) throw new Exception(result.Message);
                        }
                    }

                    message.ProcessedAtUtc = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    logger.LogWarning("Outbox message {Id} failed: {Message}", message.Id, ex.Message);
                    message.RetryCount++;
                    message.Error = ex.Message;

                    if (message.Type == nameof(DeductBalanceForPayoutCommand))
                    {
                        var command = JsonSerializer.Deserialize<DeductBalanceForPayoutCommand>(message.Content);
                        if (command != null)
                        {
                            var payout = await dbContext.PayoutRequests.FirstOrDefaultAsync(p => p.Id == command.PayoutRequestId, ct);
                            if (payout != null)
                            {
                                payout.Status = PayoutStatus.Failed;
                                payout.FailureReason = ex.Message;
                            }
                        }
                    }
                }

                await dbContext.SaveChangesAsync(ct);
            }

            await tx.CommitAsync(ct);
            return messages.Count;
        });
    }
}
