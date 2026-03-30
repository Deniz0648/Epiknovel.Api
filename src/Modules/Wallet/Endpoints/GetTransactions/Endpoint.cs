using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Modules.Wallet.Domain;

namespace Epiknovel.Modules.Wallet.Endpoints.GetTransactions;

public record Request
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public record TransactionDto
{
    public Guid Id { get; init; }
    public decimal Amount { get; init; } // Coin miktarı
    public decimal? FiatAmount { get; init; } // Nakit TL Karşılığı (Snapshottan gelen net kazanç)
    public string Type { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public Guid? ReferenceId { get; init; }
}

public record Response
{
    public IReadOnlyList<TransactionDto> Items { get; init; } = Array.Empty<TransactionDto>();
    public int TotalCount { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/wallet/transactions");
        // Authorize is default
        Summary(s => {
            s.Summary = "Cüzdan işlem geçmişini getir.";
            s.Description = "Kullanıcının veya yazarın hesaplarında gerçekleşen tüm coin ve TL hareketlerini (Transaction) sayfalı olarak listeler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var query = dbContext.WalletTransactions
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt);

        var total = await query.CountAsync(ct);

        var items = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(t => new TransactionDto
            {
                Id = t.Id,
                Amount = t.CoinAmount,
                FiatAmount = t.FiatAmount,
                Type = t.Type.ToString(),
                Description = t.Description,
                CreatedAt = t.CreatedAt,
                ReferenceId = t.ReferenceId
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Items = items,
            TotalCount = total
        }), 200, ct);
    }
}
