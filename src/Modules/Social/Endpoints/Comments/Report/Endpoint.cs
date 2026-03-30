using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Report;

public record Request
{
    public Guid CommentId { get; init; }
    public ReportReason Reason { get; init; }
    public string? Description { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/comments/{commentId}/report");
        Summary(s => {
            s.Summary = "Bir yorumu raporla.";
            s.Description = "Uygunsuz içerik taşıyan yorumları yetkililere bildirir.";
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

        var report = new CommentReport
        {
            CommentId = req.CommentId,
            UserId = userId,
            Reason = req.Reason,
            Description = req.Description,
            CreatedAt = DateTime.UtcNow,
            IsReviewed = false
        };

        dbContext.CommentReports.Add(report);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Bildiriminiz incelenmek üzere kaydedildi."), 200, ct);
    }
}
