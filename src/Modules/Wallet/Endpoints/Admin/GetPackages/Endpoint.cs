using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Modules.Wallet.Endpoints.GetPackages;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.GetPackages;

public record Request
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 50; // Paket sayısı genelde azdır ama yapısal bütünlük için ekliyoruz
    public string? Search { get; init; }
}

public record Response
{
    public List<WalletPackageDto> Items { get; init; } = [];
    public int TotalCount { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/wallet/admin/packages");
        Policies(PolicyNames.SuperAdminOnly);
        Summary(s => {
            s.Summary = "Tüm jeton paketlerini (aktif/pasif dahil) listele - Sadece Yönetici.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var query = dbContext.CoinPackages
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(req.Search))
        {
            var search = req.Search.ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(search) || x.Id.ToString().ToLower().Contains(search));
        }

        var total = await query.CountAsync(ct);

        var packages = await query
            .OrderBy(x => x.DisplayOrder)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(x => new WalletPackageDto(
                x.Id,
                x.Amount,
                x.Price,
                x.ImageUrl ?? "Zap",
                x.Name,
                x.IsPopular,
                x.IsBestValue,
                x.BonusAmount,
                x.IsActive,
                x.DisplayOrder
            ))
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Items = packages,
            TotalCount = total
        }), 200, ct);
    }
}
