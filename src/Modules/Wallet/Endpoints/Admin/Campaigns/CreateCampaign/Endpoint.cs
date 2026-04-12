using FastEndpoints;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.Campaigns.CreateCampaign;

public record Request
{
    [Required] public string Name { get; init; } = string.Empty;
    public CampaignTargetType TargetType { get; init; }
    public Guid? TargetId { get; init; }
    [Range(1, 99)] public int DiscountPercentage { get; init; }
    public CampaignSponsorType SponsorType { get; init; }
    public DateTime StartDate { get; init; }
    public DateTime EndDate { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/wallet/admin/campaigns");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Yeni bir harcama kampanyası oluşturur.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // Global kampanya emniyeti: Global ise Sponsor mecburen Platform olmalı
        var sponsorType = req.TargetType == CampaignTargetType.Global 
            ? CampaignSponsorType.Platform 
            : req.SponsorType;

        var campaign = new SpendingCampaign
        {
            Name = req.Name,
            TargetType = req.TargetType,
            TargetId = req.TargetId,
            DiscountPercentage = req.DiscountPercentage,
            SponsorType = sponsorType,
            StartDate = req.StartDate.ToUniversalTime(),
            EndDate = req.EndDate.ToUniversalTime(),
            IsActive = true
        };

        dbContext.SpendingCampaigns.Add(campaign);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Guid>.Success(campaign.Id), 200, ct);
    }
}
