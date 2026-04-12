using FastEndpoints;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.GetWithdrawals;

public record Request
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Search { get; init; }
    public WithdrawStatus? Status { get; init; } // NULL ise hepsi
}

public record WithdrawDto
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string UserName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string IBAN { get; init; } = string.Empty;
    public string AccountHolderName { get; init; } = string.Empty;
    public WithdrawStatus Status { get; init; }
    public DateTime CreatedAt { get; init; }
    public string? AdminNote { get; init; }
    public string? ReceiptDocumentId { get; init; }
}

public record Response
{
    public List<WithdrawDto> Items { get; init; } = [];
    public int TotalCount { get; init; }
}

public class Endpoint(WalletDbContext dbContext, IUserProvider userProvider) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/wallet/admin/withdrawals");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Tüm para çekme taleplerini listeler (Admin).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var query = dbContext.WithdrawRequests.AsNoTracking();

        if (req.Status.HasValue)
        {
            query = query.Where(x => x.Status == req.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var search = req.Search.ToLower();
            query = query.Where(x => 
                x.IBAN.ToLower().Contains(search) || 
                x.AccountHolderName.ToLower().Contains(search));
        }

        var total = await query.CountAsync(ct);

        var withdrawals = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToListAsync(ct);

        var userIds = withdrawals.Select(x => x.UserId).Distinct().ToList();
        var userNames = await userProvider.GetDisplayNamesByUserIdsAsync(userIds, ct);

        var items = withdrawals.Select(x => new WithdrawDto
        {
            Id = x.Id,
            UserId = x.UserId,
            UserName = userNames.GetValueOrDefault(x.UserId, "Bilinmeyen Yazar"),
            Amount = x.Amount,
            IBAN = x.IBAN,
            AccountHolderName = x.AccountHolderName,
            Status = x.Status,
            CreatedAt = x.CreatedAt,
            AdminNote = x.AdminNote,
            ReceiptDocumentId = x.ReceiptDocumentId
        }).ToList();

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Items = items,
            TotalCount = total
        }), 200, ct);
    }
}
