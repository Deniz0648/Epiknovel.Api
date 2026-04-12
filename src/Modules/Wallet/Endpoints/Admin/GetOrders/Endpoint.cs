using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.GetOrders;

public record OrderDto(
    Guid Id,
    Guid UserId,
    string BuyerEmail,
    string PackageName,
    decimal PricePaid,
    decimal CoinAmount,
    OrderStatus Status,
    string? InvoiceFileUrl,
    DateTime CreatedAt,
    DateTime? PaidAt
);

public record Request
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? Search { get; init; }
}

public record Response
{
    public List<OrderDto> Items { get; init; } = [];
    public int TotalCount { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/wallet/admin/orders");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Tüm satın alma siparişlerini listele (Admin).";
            s.Description = "Platform genelindeki tüm coin satın alma işlemlerini kronolojik olarak listeler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var query = dbContext.CoinPurchaseOrders
            .Include(o => o.Package)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var search = req.Search.ToLower();
            query = query.Where(o => 
                o.BuyerEmail.ToLower().Contains(search) || 
                o.UserId.ToString().ToLower().Contains(search) ||
                o.Id.ToString().ToLower().Contains(search));
        }

        var total = await query.CountAsync(ct);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(o => new OrderDto(
                o.Id,
                o.UserId,
                o.BuyerEmail,
                o.Package != null ? o.Package.Name : "Özel Paket",
                o.PricePaid,
                o.CoinAmount,
                o.Status,
                o.InvoiceFileUrl,
                o.CreatedAt,
                o.PaidAt
            ))
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Items = orders,
            TotalCount = total
        }), 200, ct);
    }
}
