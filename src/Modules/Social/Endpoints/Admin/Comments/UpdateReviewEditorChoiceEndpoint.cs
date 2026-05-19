using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Endpoints.Admin.Comments;

public class UpdateReviewEditorChoiceRequest
{
    public Guid Id { get; set; }
    public bool IsEditorChoice { get; set; }
}

[AuditLog("Update Review Editor Choice Status")]
public class UpdateReviewEditorChoiceEndpoint(SocialDbContext dbContext) : Endpoint<UpdateReviewEditorChoiceRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/social/admin/reviews/{Id}/editor-choice");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateReviewEditorChoiceRequest req, CancellationToken ct)
    {
        var routeId = Route<Guid>("Id");
        if (routeId == Guid.Empty || req.Id == Guid.Empty || routeId != req.Id)
        {
            await Send.ResponseAsync(Result<string>.Failure("Route Id ve payload Id eslesmiyor."), 400, ct);
            return;
        }

        // Sadece inceleme kaydı güncellenir.
        var review = await dbContext.Reviews.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (review != null)
        {
            review.IsEditorChoice = req.IsEditorChoice;
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<string>.Success("İnceleme durumu başarıyla güncellendi."), 200, ct);
            return;
        }
        await Send.ResponseAsync(Result<string>.Failure("Inceleme bulunamadi."), 404, ct);
    }
}
