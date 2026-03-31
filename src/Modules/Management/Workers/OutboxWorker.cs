using System.Text.Json;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Commands.Wallet;
using Epiknovel.Shared.Core.Commands.Books;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Management.Workers;

public class OutboxWorker(IServiceProvider serviceProvider, ILogger<OutboxWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Outbox Worker starting (Interval: 5s)");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessOutboxAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred during outbox processing");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }

    private async Task ProcessOutboxAsync(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ManagementDbContext>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var messages = await dbContext.OutboxMessages
            .Where(m => m.ProcessedAt == null && m.AttemptCount < 5)
            .OrderBy(m => m.CreatedAt)
            .Take(10)
            .ToListAsync(ct);

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
                        if (!result.IsSuccess)
                        {
                            throw new Exception(result.Message);
                        }

                        // Success: Update Payout table status
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
                
                message.ProcessedAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                logger.LogWarning("Outbox message {Id} failed: {Message}", message.Id, ex.Message);
                message.AttemptCount++;
                message.Error = ex.Message;

                // Sync Failure state back if it was a payout item
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

            // Save after each message or in batches
            await dbContext.SaveChangesAsync(ct);
        }
    }
}
