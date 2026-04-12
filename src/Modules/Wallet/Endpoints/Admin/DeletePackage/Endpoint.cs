using FastEndpoints;
using Epiknovel.Modules.Wallet.Data;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.DeletePackage;

public record Request
{
    public Guid Id { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<bool>>
{
    public override void Configure()
    {
        Delete("/wallet/admin/packages/{Id}");
        Policies(PolicyNames.SuperAdminOnly);
        Summary(s => {
            s.Summary = "Bir jeton paketini sil.";
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

        dbContext.CoinPackages.Remove(package);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<bool>.Success(true), 200, ct);
    }
}
