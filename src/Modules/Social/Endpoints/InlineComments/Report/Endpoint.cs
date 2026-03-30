using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.InlineComments.Report;

public record Request
{
    public Guid InlineCommentId { get; init; }
    public ReportReason Reason { get; init; }
    public string? Description { get; init; }
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/inline-comments/{inlineCommentId}/report");
        Summary(s => {
            s.Summary = "Satır yorumunu raporla.";
            s.Description = "Bölüm içindeki bir paragrafa yapılmış uygunsuz yorumu yetkililere bildirir.";
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

        var comment = await dbContext.InlineComments.AnyAsync(c => c.Id == req.InlineCommentId, ct);
        if (!comment)
        {
            await Send.ResponseAsync(Result<string>.Failure("Yorum bulunamadı."), 404, ct);
            return;
        }

        var report = new InlineCommentReport
        {
            InlineCommentId = req.InlineCommentId,
            UserId = userId,
            Reason = req.Reason,
            Description = req.Description,
            CreatedAt = DateTime.UtcNow,
            IsReviewed = false
        };

        dbContext.InlineCommentReports.Add(report);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Bildiriminiz kaydedildi."), 200, ct);
    }
}
