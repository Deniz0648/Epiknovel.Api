using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentList;

public record GetCommentListQuery(
    Guid? BookId,
    Guid? ChapterId,
    string? ParagraphId,
    Guid? ParentCommentId = null,
    int Page = 1,
    int Size = 10,
    string? SortBy = "Newest", // Newest, Top, Oldest
    bool IncludeSpoilers = false,
    Guid? CurrentUserId = null
) : IRequest<Result<CommentListResponse>>;

public record CommentListResponse(List<CommentItemResponse> Items, int TotalCount);

public record CommentAuthorInfo(
    Guid Id,
    string DisplayName,
    string UserSlug,
    string? AvatarUrl,
    bool IsAuthor
);

public record CommentItemResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string Content { get; set; } = string.Empty;
    public string? ContentToken { get; set; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public int LikeCount { get; init; }
    public int ReplyCount { get; init; }
    public bool IsSpoiler { get; init; }
    public bool IsPinned { get; init; }
    public bool IsAuthorComment { get; init; }
    public bool IsEdited { get; init; }
    public bool IsLikedByCurrentUser { get; set; }
    public string? ParagraphId { get; init; }
    
    public bool CanEdit { get; set; }
    public bool CanPin { get; set; }
    public bool CanDelete { get; set; }

    public CommentAuthorInfo AuthorInfo { get; set; } = null!;
    public List<CommentItemResponse> TopReplies { get; init; } = new();
}
