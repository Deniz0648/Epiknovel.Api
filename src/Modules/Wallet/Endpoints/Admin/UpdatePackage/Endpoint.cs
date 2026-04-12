using FastEndpoints;
using Epiknovel.Modules.Wallet.Data;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.UpdatePackage;

public record Request
{
    public Guid Id { get; init; }
    public string Name { get; init; } = null!;
    public decimal Price { get; init; }
    public int Amount { get; init; }
    public int BonusAmount { get; init; }
    public string? Icon { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsActive { get; init; }
    public bool IsBestValue { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<bool>>
{
    public override void Configure()
    {
        Put("/wallet/admin/packages/{Id}");
        Policies(PolicyNames.SuperAdminOnly);
        Summary(s => {
            s.Summary = "Mevcut bir jeton paketini güncelle.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var package = await dbContext.CoinPackages.FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (package == null)
        {
            await Send.ResponseAsync(Result<bool>.Failure("Paket bulunamadı."), 404, ct);
            return;
        }

        package.Name = req.Name;
        package.Price = req.Price;
        package.Amount = req.Amount;
        package.BonusAmount = req.BonusAmount;
        package.ImageUrl = req.Icon;
        package.DisplayOrder = req.DisplayOrder;
        package.IsActive = req.IsActive;
        package.IsBestValue = req.IsBestValue;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<bool>.Success(true), 200, ct);
    }
}
