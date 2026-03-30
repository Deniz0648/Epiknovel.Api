using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Reviews.Report;

public record Request
{
    public Guid ReviewId { get; init; }
    public ReportReason Reason { get; init; }
    public string? Description { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/reviews/{reviewId}/report");
        Summary(s => {
            s.Summary = "Bir incelemeyi raporla.";
            s.Description = "Uygunsuz içerik taşıyan kitap incelemelerini yetkililere bildirir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var review = await dbContext.Reviews.AnyAsync(r => r.Id == req.ReviewId, ct);
        if (!review)
        {
            await Send.ResponseAsync(Result<string>.Failure("İnceleme bulunamadı."), 404, ct);
            return;
        }

        var report = new ReviewReport
        {
            ReviewId = req.ReviewId,
            UserId = userId,
            Reason = req.Reason,
            Description = req.Description,
            CreatedAt = DateTime.UtcNow,
            IsReviewed = false
        };

        dbContext.ReviewReports.Add(report);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Bildiriminiz incelenmek üzere kaydedildi. Hassasiyetiniz için teşekkür ederiz."), 200, ct);
    }
}
