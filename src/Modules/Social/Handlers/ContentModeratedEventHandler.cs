using System.Threading;
using System.Threading.Tasks;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Enums;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;

namespace Epiknovel.Modules.Social.Handlers;

public class ContentModeratedEventHandler(SocialDbContext dbContext) : INotificationHandler<ContentModeratedEvent>
{
    public async Task Handle(ContentModeratedEvent notification, CancellationToken cancellationToken)
    {
        if (!notification.IsDeleted) return; // Sadece silme/gizleme aksiyonlarını ele alıyoruz

        switch (notification.ContentType)
        {
            case TargetContentType.Comment:
                var comment = await dbContext.Comments.FirstOrDefaultAsync(c => c.Id == notification.ContentId, cancellationToken);
                if (comment != null)
                {
                    var hasReplies = await dbContext.Comments.AnyAsync(c => c.ParentCommentId == comment.Id, cancellationToken);

                    if (notification.DeleteReplies)
                    {
                        // Kendisini ve tüm alt yorumları sil (IsDeleted = true)
                        var allThreadIds = await GetCommentThreadIds(comment.Id, cancellationToken);
                        var commentsToHide = await dbContext.Comments
                            .Where(c => allThreadIds.Contains(c.Id))
                            .ToListAsync(cancellationToken);

                        foreach (var c in commentsToHide)
                        {
                            c.IsDeleted = true;
                            c.IsHidden = true;
                            c.DeletedAt = notification.ModeratedAt;
                            c.DeletedByUserId = notification.AdminId;
                            c.ModerationNote = notification.ActionReason;
                        }
                    }
                    else if (hasReplies)
                    {
                        // Alt yorumu var, sadece içeriği temizle
                        comment.Content = "[Bu yorum yönetici tarafından silinmiştir]";
                        comment.ModerationNote = notification.ActionReason;
                        comment.IsHidden = false; // İçerik görüntülenecek ama placeholder ile
                    }
                    else
                    {
                        // Alt yorumu yok, tamamen sil/gizle
                        comment.IsDeleted = true;
                        comment.IsHidden = true;
                        comment.DeletedAt = notification.ModeratedAt;
                        comment.DeletedByUserId = notification.AdminId;
                        comment.ModerationNote = notification.ActionReason;
                    }
                }
                break;

            case TargetContentType.Review:
                var review = await dbContext.Reviews.FirstOrDefaultAsync(r => r.Id == notification.ContentId, cancellationToken);
                if (review != null)
                {
                    review.IsDeleted = true;
                    review.IsHidden = true;
                    review.DeletedAt = notification.ModeratedAt;
                    review.DeletedByUserId = notification.AdminId;
                    review.ModerationNote = notification.ActionReason;
                }
                break;

            case TargetContentType.InlineComment:
                var inlineComment = await dbContext.InlineComments.FirstOrDefaultAsync(ic => ic.Id == notification.ContentId, cancellationToken);
                if (inlineComment != null)
                {
                    inlineComment.IsDeleted = true;
                    inlineComment.IsHidden = true;
                    inlineComment.DeletedAt = notification.ModeratedAt;
                    inlineComment.DeletedByUserId = notification.AdminId;
                    inlineComment.ModerationNote = notification.ActionReason;
                }
                break;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<Guid>> GetCommentThreadIds(Guid rootId, CancellationToken ct)
    {
        var ids = new List<Guid> { rootId };
        var currentLevel = new List<Guid> { rootId };

        while (currentLevel.Count > 0)
        {
            var nextLevel = await dbContext.Comments
                .Where(c => currentLevel.Contains(c.ParentCommentId ?? Guid.Empty))
                .Select(c => c.Id)
                .ToListAsync(ct);

            ids.AddRange(nextLevel);
            currentLevel = nextLevel;
        }

        return ids;
    }
}
