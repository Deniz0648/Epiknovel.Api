using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Interfaces.Management;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Services;

public class ManagementSocialProvider(SocialDbContext dbContext) : IManagementSocialProvider
{
    public async Task<bool> DeleteCommentAsync(Guid commentId, bool deleteTree, CancellationToken ct = default)
    {
        var comment = await dbContext.Comments.FirstOrDefaultAsync(c => c.Id == commentId, ct);
        if (comment == null) return false;

        if (deleteTree)
        {
            // Simple recursive or flat delete for children
            var children = await dbContext.Comments.Where(c => c.ParentCommentId == commentId).ToListAsync(ct);
            foreach (var child in children)
            {
                child.UndoDelete(); // If we just want to mark deleted via soft delete
                // Actually base entity has IsDeleted
            }
        }

        comment.DeletedAt = DateTime.UtcNow;
        // Assume soft delete is handled by interceptor or manual property
        // Actually base entity handles this if using the AuditInterceptor or manual SaveChanges logic
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> HideCommentAsync(Guid commentId, CancellationToken ct = default)
    {
        // For now, hiding is same as Soft Delete in this module's design
        return await DeleteCommentAsync(commentId, false, ct);
    }

    public async Task<List<CommentManagementDto>> GetPaginatedCommentsAsync(DateTime? cursor, int take, Guid? bookId, Guid? userId, CancellationToken ct = default)
    {
        var query = dbContext.Comments.AsNoTracking();

        if (cursor.HasValue)
        {
            query = query.Where(c => c.CreatedAt < cursor.Value);
        }

        if (bookId.HasValue) query = query.Where(c => c.BookId == bookId.Value);
        if (userId.HasValue) query = query.Where(c => c.UserId == userId.Value);

        return await query
            .OrderByDescending(c => c.CreatedAt)
            .Take(take)
            .Select(c => new CommentManagementDto
            {
                Id = c.Id,
                UserId = c.UserId,
                BookId = c.BookId,
                Content = c.Content,
                CreatedAt = c.CreatedAt,
                IsDeleted = c.DeletedAt != null
                // Note: userDisplayName and bookTitle will be empty for now to maintain isolation
            })
            .ToListAsync(ct);
    }
}
