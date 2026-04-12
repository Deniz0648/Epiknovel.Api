using FastEndpoints;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.Campaigns.DeleteCampaign;

public record Request { public Guid Id { get; init; } }

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Delete("/wallet/admin/campaigns/{Id}");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Bir harcama kampanyasını siler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var campaign = await dbContext.SpendingCampaigns.FindAsync([req.Id], ct);

        if (campaign == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Kampanya bulunamadı."), 404, ct);
            return;
        }

        dbContext.SpendingCampaigns.Remove(campaign);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Kampanya başarıyla silindi."), 200, ct);
    }
}
