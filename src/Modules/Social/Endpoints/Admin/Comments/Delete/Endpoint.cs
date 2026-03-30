using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Admin.Comments.Delete;

public record Request
{
    public Guid CommentId { get; init; }
    public string Reason { get; init; } = string.Empty;
}

public class Endpoint(SocialDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Delete("/social/admin/comments/{commentId}");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Yorumu yönetici olarak sil.";
            s.Description = "Moderatör veya yöneticilerin uygunsuz yorumları sistemden (soft-delete) silmesini sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var adminIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(adminIdString, out var adminId);

        var comment = await dbContext.Comments
            .FirstOrDefaultAsync(c => c.Id == req.CommentId, ct);

        if (comment == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Yorum bulunamadı."), 404, ct);
            return;
        }

        comment.IsDeleted = true;
        comment.DeletedAt = DateTime.UtcNow;
        comment.DeletedByUserId = adminId;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Yorum yönetici tarafından silindi."), 200, ct);
    }
}
