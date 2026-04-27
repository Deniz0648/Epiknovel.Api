using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Comments.Commands.DeleteComment;

public class DeleteCommentHandler(SocialDbContext dbContext) : IRequestHandler<DeleteCommentCommand, Result<string>>
{
    public async Task<Result<string>> Handle(DeleteCommentCommand request, CancellationToken ct)
    {
        try
        {
            var comment = await dbContext.Comments
                .FirstOrDefaultAsync(c => c.Id == request.CommentId && !c.IsDeleted, ct);

            if (comment == null)
            {
                return Result<string>.Failure("Yorum bulunamadı.");
            }

            if (comment.UserId != request.UserId)
            {
                return Result<string>.Failure("Bu işlem için yetkiniz yok.");
            }

            // 🗑️ Soft Delete
            comment.DeletedAt = DateTime.UtcNow;
            comment.IsDeleted = true;

            // 📉 Eğer bu bir yanıtsa, ana yorumun ReplyCount değerini azalt
            if (comment.ParentCommentId.HasValue)
            {
                var parent = await dbContext.Comments
                    .FirstOrDefaultAsync(c => c.Id == comment.ParentCommentId.Value, ct);
                
                if (parent != null && parent.ReplyCount > 0)
                {
                    parent.ReplyCount--;
                }
            }

            await dbContext.SaveChangesAsync(ct);

            return Result<string>.Success("Yorum başarıyla silindi.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] DeleteCommentHandler: {ex.Message}");
            return Result<string>.Failure("Yorum silinirken bir hata oluştu.");
        }
    }
}
