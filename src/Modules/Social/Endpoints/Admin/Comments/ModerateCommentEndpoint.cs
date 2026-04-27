using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Endpoints.Admin.Comments;

public enum ModerationAction
{
    Hide,
    Unhide,
    MarkSpoiler,
    RemoveSpoiler,
    HideThread
}

public class ModerateCommentRequest
{
    public Guid Id { get; set; }
    public ModerationAction Action { get; set; }
}

[AuditLog("Moderate Social Content")]
public class ModerateCommentEndpoint(SocialDbContext dbContext) : Endpoint<ModerateCommentRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/social/admin/moderate");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(ModerateCommentRequest req, CancellationToken ct)
    {
        // 1. Önce Genel Yorumlarda (Comments) ara
        var comment = await dbContext.Comments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (comment != null)
        {
            switch (req.Action)
            {
                case ModerationAction.Hide:
                    comment.IsHidden = true;
                    break;
                case ModerationAction.Unhide:
                    comment.IsHidden = false;
                    break;
                case ModerationAction.MarkSpoiler:
                    comment.IsSpoiler = true;
                    break;
                case ModerationAction.RemoveSpoiler:
                    comment.IsSpoiler = false;
                    break;
                case ModerationAction.HideThread:
                    comment.IsHidden = true;
                    // Tüm yanıtları da gizle
                    var replies = await dbContext.Comments.IgnoreQueryFilters()
                        .Where(x => x.ParentCommentId == comment.Id)
                        .ToListAsync(ct);
                    foreach (var reply in replies) reply.IsHidden = true;
                    break;
            }
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<string>.Success("Yorum başarıyla güncellendi."), 200, ct);
            return;
        }

        // 2. İncelemelerde (Reviews) ara
        var review = await dbContext.Reviews.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (review != null)
        {
            switch (req.Action)
            {
                case ModerationAction.Hide:
                    review.IsHidden = true;
                    break;
                case ModerationAction.Unhide:
                    review.IsHidden = false;
                    break;
                case ModerationAction.MarkSpoiler:
                    review.IsSpoiler = true;
                    break;
                case ModerationAction.RemoveSpoiler:
                    review.IsSpoiler = false;
                    break;
                case ModerationAction.HideThread:
                    review.IsHidden = true; // İncelemelerde thread yok, sadece kendisini gizle
                    break;
            }
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<string>.Success("İnceleme başarıyla güncellendi."), 200, ct);
            return;
        }

        // 3. Satır Yorumlarında (InlineComments) ara
        var inline = await dbContext.InlineComments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        if (inline != null)
        {
            switch (req.Action)
            {
                case ModerationAction.Hide:
                    inline.IsHidden = true;
                    break;
                case ModerationAction.Unhide:
                    inline.IsHidden = false;
                    break;
                case ModerationAction.MarkSpoiler:
                    inline.IsSpoiler = true;
                    break;
                case ModerationAction.RemoveSpoiler:
                    inline.IsSpoiler = false;
                    break;
                case ModerationAction.HideThread:
                    inline.IsHidden = true; // Satır yorumlarında thread yok
                    break;
            }
            await dbContext.SaveChangesAsync(ct);
            await Send.ResponseAsync(Result<string>.Success("Satır yorumu başarıyla güncellendi."), 200, ct);
            return;
        }

        await Send.NotFoundAsync(ct);
    }
}
