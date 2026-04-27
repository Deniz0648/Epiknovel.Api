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
        // Önce İncelemelerde ara
        var review = await dbContext.Reviews.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (review != null)
        {
            review.IsEditorChoice = req.IsEditorChoice;
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<string>.Success("İnceleme durumu başarıyla güncellendi."), 200, ct);
            return;
        }

        // Bulunamazsa Yorumlarda ara
        var comment = await dbContext.Comments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (comment != null)
        {
            comment.IsEditorChoice = req.IsEditorChoice;
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<string>.Success("Yorum durumu başarıyla güncellendi."), 200, ct);
            return;
        }

        await Send.NotFoundAsync(ct);
    }
}
