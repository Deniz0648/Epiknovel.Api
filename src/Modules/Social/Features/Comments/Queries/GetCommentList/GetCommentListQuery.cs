using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentList;

public record GetCommentListQuery(
    Guid? BookId,
    Guid? ChapterId,
    int Page,
    int Size
) : IRequest<Result<List<CommentItemResponse>>>;

public record CommentItemResponse
{
    public Guid Id { get; init; }
    public Guid UserId { get; init; }
    public string Content { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public int LikeCount { get; init; }
    public List<CommentItemResponse> Replies { get; init; } = new();
}
