using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Wallet.Endpoints.GetPackages;

public record WalletPackageDto(
    Guid Id,
    int Tokens,
    decimal Price,
    string Icon,
    string Name,
    bool Popular = false,
    bool BestValue = false,
    int Bonus = 0,
    bool IsActive = true,
    int DisplayOrder = 0
);

public class Endpoint(WalletDbContext dbContext) : EndpointWithoutRequest<Result<List<WalletPackageDto>>>
{
    public override void Configure()
    {
        Get("/wallet/packages");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Satın alınabilir jeton paketlerini listele.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var packages = await dbContext.CoinPackages
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder)
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

        await Send.ResponseAsync(Result<List<WalletPackageDto>>.Success(packages), 200, ct);
    }
}
