using FastEndpoints;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.CreatePackage;

public record Request
{
    public string Name { get; init; } = null!;
    public decimal Price { get; init; }
    public int Amount { get; init; }
    public int BonusAmount { get; init; }
    public string? Icon { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsBestValue { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/wallet/admin/packages");
        Policies(PolicyNames.SuperAdminOnly);
        Summary(s => {
            s.Summary = "Yeni bir jeton paketi oluştur.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var package = new CoinPackage
        {
            Name = req.Name,
            Price = req.Price,
            Amount = req.Amount,
            BonusAmount = req.BonusAmount,
            ImageUrl = req.Icon,
            DisplayOrder = req.DisplayOrder,
            IsActive = true,
            IsBestValue = req.IsBestValue
        };

        dbContext.CoinPackages.Add(package);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(package.Id), 201, ct);
    }
}
