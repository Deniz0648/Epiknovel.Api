using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Wallet.Endpoints.Orders.GetMine;

public record Request
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}

public record Response
{
    public List<OrderDto> Items { get; init; } = [];
    public int TotalCount { get; init; }
}

public record OrderDto(
    Guid Id,
    string PackageName,
    decimal PricePaid,
    decimal CoinAmount,
    OrderStatus Status,
    string? InvoiceDocumentId,
    DateTime CreatedAt,
    DateTime? PaidAt);

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/wallet/orders/me");
        Summary(s => {
            s.Summary = "Kullanıcının kendi sipariş geçmişini getirir.";
            s.Description = "Giriş yapmış kullanıcının Iyzico üzerinden yaptığı tüm satın alma (TL) geçmişini sayfalı olarak döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Oturum bulunamadı."), 401, ct);
            return;
        }

        var query = dbContext.CoinPurchaseOrders
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt);

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(o => new OrderDto(
                o.Id,
                o.Package != null ? o.Package.Name : "Coin Paketi",
                o.PricePaid,
                o.CoinAmount,
                o.Status,
                o.InvoiceDocumentId != null ? o.InvoiceDocumentId.ToString() : null,
                o.CreatedAt,
                o.PaidAt))
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Items = items,
            TotalCount = totalCount
        }), 200, ct);
    }
}
