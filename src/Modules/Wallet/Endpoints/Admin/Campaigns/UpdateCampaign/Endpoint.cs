using FastEndpoints;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.Campaigns.UpdateCampaign;

public record Request
{
    public Guid Id { get; init; }
    [Required] public string Name { get; init; } = string.Empty;
    public int DiscountPercentage { get; init; }
    public CampaignSponsorType SponsorType { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
    public bool IsActive { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Put("/wallet/admin/campaigns/{Id}");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Mevcut bir harcama kampanyasını günceller.";
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

        // Global kampanya emniyeti: Global ise Sponsor mecburen Platform olmalı
        var sponsorType = campaign.TargetType == CampaignTargetType.Global 
            ? CampaignSponsorType.Platform 
            : req.SponsorType;

        campaign.Name = req.Name;
        campaign.DiscountPercentage = req.DiscountPercentage;
        campaign.SponsorType = sponsorType;
        campaign.StartDate = req.StartDate.ToUniversalTime();
        campaign.EndDate = req.EndDate.ToUniversalTime();
        campaign.IsActive = req.IsActive;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Kampanya başarıyla güncellendi."), 200, ct);
    }
}
