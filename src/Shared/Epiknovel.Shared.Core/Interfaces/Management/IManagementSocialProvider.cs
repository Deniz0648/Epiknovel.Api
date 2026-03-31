namespace Epiknovel.Shared.Core.Interfaces.Management;

public interface IManagementSocialProvider
{
    Task<bool> DeleteCommentAsync(Guid commentId, bool deleteTree, CancellationToken ct = default);
    Task<bool> HideCommentAsync(Guid commentId, CancellationToken ct = default);
    Task<List<CommentManagementDto>> GetPaginatedCommentsAsync(DateTime? cursor, int take, Guid? bookId, Guid? userId, CancellationToken ct = default);
}

public class CommentManagementDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserDisplayName { get; set; } = string.Empty;
    public Guid? BookId { get; set; }
    public string? BookTitle { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsDeleted { get; set; }
}
