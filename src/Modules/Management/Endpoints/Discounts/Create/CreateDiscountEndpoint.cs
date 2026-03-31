using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Commands.Books;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Epiknovel.Modules.Management.Endpoints.Discounts.Create;

public record CreateDiscountRequest
{
    public string? Code { get; init; }
    public DiscountScope Scope { get; init; }
    public Guid? TargetId { get; init; }
    public DiscountType Type { get; init; }
    public decimal Value { get; init; }
    public DateTime StartsAt { get; init; }
    public DateTime EndsAt { get; init; }
}

[AuditLog("Create Marketing Discount")]
public class CreateDiscountEndpoint(ManagementDbContext dbContext) : Endpoint<CreateDiscountRequest, Result<Guid>>
{
    public override void Configure()
    {
        Post("/management/discounts");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Create a new discount campaign";
            s.Description = "Creates a discount (Global/Category/Book) and triggers asynchronous price pre-calculation via Outbox.";
        });
    }

    public override async Task HandleAsync(CreateDiscountRequest req, CancellationToken ct)
    {
        var discount = new Discount
        {
            Code = req.Code,
            Scope = req.Scope,
            TargetId = req.TargetId,
            Type = req.Type,
            Value = req.Value,
            StartsAt = req.StartsAt,
            EndsAt = req.EndsAt,
            IsActive = true
        };

        dbContext.Discounts.Add(discount);

        // Queue the synchronization
        var syncCommand = new SyncDiscountsCommand(
            (DiscountScopeType)req.Scope,
            req.TargetId,
            (DiscountValueType)req.Type,
            req.Value,
            true);

        var outboxMessage = new OutboxMessage
        {
            Type = nameof(SyncDiscountsCommand),
            Content = JsonSerializer.Serialize(syncCommand),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.OutboxMessages.Add(outboxMessage);

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(discount.Id), 200, ct);
    }
}
