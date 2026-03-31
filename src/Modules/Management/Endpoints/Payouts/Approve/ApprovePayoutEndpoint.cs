using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Commands.Wallet;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Epiknovel.Modules.Management.Endpoints.Payouts.Approve;

public record ApprovePayoutRequest
{
    public Guid PayoutId { get; init; }
    public string? Note { get; init; }
}

[AuditLog("Approve Payout")]
public class ApprovePayoutEndpoint(ManagementDbContext dbContext) : Endpoint<ApprovePayoutRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/payouts/{PayoutId}/approve");
        Policies(PolicyNames.AdminAccess); // Only high-level admins can approve money transfers
        Summary(s =>
        {
            s.Summary = "Approve Payout Request";
            s.Description = "Approves a pending payout. Deducts balance from the user's wallet via the Wallet module. Requires X-Idempotency-Key for safety.";
        });
    }

    public override async Task HandleAsync(ApprovePayoutRequest req, CancellationToken ct)
    {
        // 1. Check Idempotency Key in Header
        var idempotencyKey = HttpContext.Request.Headers["X-Idempotency-Key"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(idempotencyKey))
        {
            await Send.ResponseAsync(Result<string>.Failure("X-Idempotency-Key header is required for financial operations."), 400, ct);
            return;
        }

        // 2. Fetch Payout and Check State
        var payout = await dbContext.PayoutRequests.FirstOrDefaultAsync(p => p.Id == req.PayoutId, ct);
        if (payout == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Payout request not found."), 404, ct);
            return;
        }

        // 3. Verify Idempotency - If already processed with this key
        if (payout.IdempotencyKey == idempotencyKey && payout.Status == PayoutStatus.Completed)
        {
            await Send.ResponseAsync(Result<string>.Success("Payout was already completed successfully (Idempotent)."), 200, ct);
            return;
        }

        if (payout.Status != PayoutStatus.Pending && payout.Status != PayoutStatus.Failed)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Payout cannot be approved because its current status is {payout.Status}."), 400, ct);
            return;
        }

        // 4. State Machine & Reliability: Register the action in the Outbox
        var command = new DeductBalanceForPayoutCommand(payout.UserId, payout.Amount, payout.Id);
        
        var outboxMessage = new OutboxMessage
        {
            Type = nameof(DeductBalanceForPayoutCommand),
            Content = JsonSerializer.Serialize(command),
            CreatedAt = DateTime.UtcNow
        };

        payout.Status = PayoutStatus.Processing;
        payout.IdempotencyKey = idempotencyKey;
        payout.AdminNote = req.Note;
        
        dbContext.OutboxMessages.Add(outboxMessage);
        await dbContext.SaveChangesAsync(ct);

        // NOTE: In a true Saga, the Payout status would be updated by the OutboxWorker 
        // after it receives a success/fail response from the mediator.
        // For the UI, we return success as the task is "Registered for reliable processing".

        await Send.ResponseAsync(Result<string>.Success("Payout approval registered and queued for reliable processing."), 202, ct);
    }
}
