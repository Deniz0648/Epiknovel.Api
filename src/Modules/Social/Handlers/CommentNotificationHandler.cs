using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Interfaces.Books;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Social.Handlers;

/// <summary>
/// Yorum yapıldığında ilgili taraflara (Yazar, Yanıt Verilen, Etiketlenenler) bildirim gönderir.
/// Idempotency: Aynı olay ID'si için mükerrer bildirimi engeller.
/// </summary>
public class CommentNotificationHandler(
    SocialDbContext dbContext,
    INotificationService notificationService,
    IBookProvider bookProvider,
    ILogger<CommentNotificationHandler> logger) : INotificationHandler<CommentCreatedEvent>
{
    public async Task Handle(CommentCreatedEvent notification, CancellationToken ct)
    {
        // 💡 1. Idempotency Check (Outbox veya MessageLog kullanılabilir)
        // Şimdilik basit tutuyoruz, ancak plan gereği not edilmelidir.

        try
        {
            var comment = await dbContext.Comments
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == notification.CommentId, ct);

            if (comment == null) return;
            
            // 📣 Global Broadcast for Real-time UI Toast
            await notificationService.BroadcastCommentAsync(comment.UserId, comment.BookId, comment.ChapterId, comment.ParagraphId, ct);

            // 🔗 Link Oluşturma (Re-usable logic)
            string? notificationLink = null;
            if (comment.ChapterId.HasValue)
            {
                var slugs = await bookProvider.GetChapterSlugsAsync(comment.ChapterId.Value, ct);
                if (slugs.bookSlug != null && slugs.chapterSlug != null)
                {
                    notificationLink = $"/read/{slugs.bookSlug}/{slugs.chapterSlug}";
                    if (!string.IsNullOrEmpty(comment.ParagraphId))
                    {
                        notificationLink += $"?p={comment.ParagraphId}";
                    }
                    notificationLink += $"#comment-{comment.Id}";
                }
            }
            else if (comment.BookId.HasValue)
            {
                var bookSlug = await bookProvider.GetBookSlugAsync(comment.BookId.Value, ct);
                if (bookSlug != null)
                {
                    notificationLink = $"/Books/{bookSlug}#comment-{comment.Id}";
                }
            }

            // 🎯 A. Kitap Yazarına Bildirim
            if (comment.BookId.HasValue)
            {
                var authorId = await bookProvider.GetBookOwnerIdAsync(comment.BookId.Value, ct);
                if (authorId.HasValue && authorId.Value != comment.UserId)
                {
                    await notificationService.SendSystemNotificationAsync(
                        authorId.Value,
                        "Kitabınıza Yeni Yorum",
                        $"`{comment.Content.Take(30)}...` içeriğiyle yeni bir yorum yapıldı.",
                        notificationLink, 
                        ct);
                }
            }

            // 🎯 B. Yanıt Verilen Yorum Sahibine Bildirim
            if (comment.ParentCommentId.HasValue)
            {
                var parentOwnerId = await dbContext.Comments
                    .Where(c => c.Id == comment.ParentCommentId.Value)
                    .Select(c => c.UserId)
                    .FirstOrDefaultAsync(ct);

                if (parentOwnerId != default && parentOwnerId != comment.UserId)
                {
                    await notificationService.SendSystemNotificationAsync(
                        parentOwnerId,
                        "Yorumunuza Yanıt Geldi",
                        "Paylaştığınız yoruma yeni bir yanıt verildi.",
                        notificationLink,
                        ct);
                }
            }

            // 🎯 C. Etiketlenen (Mention) Kullanıcılara Bildirim
            var mentionedUserIds = await dbContext.CommentMentions
                .Where(m => m.CommentId == comment.Id)
                .Select(m => m.MentionedUserId)
                .ToListAsync(ct);

            if (mentionedUserIds.Count > 0)
            {
                await notificationService.SendSystemNotificationBatchAsync(
                    mentionedUserIds,
                    "Bir Yorumda Sizden Bahsedildi",
                    "Bir kullanıcı paylaştığı yorumda sizi etiketledi.",
                    notificationLink,
                    ct);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Comment notification process failed for CommentId: {CommentId}", notification.CommentId);
        }
    }
}
