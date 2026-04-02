using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.Comments.Commands.AddComment;

public record AddCommentCommand(
    Guid UserId,
    Guid? BookId,
    Guid? ChapterId,
    Guid? ParentCommentId,
    string Content
) : IRequest<Result<Guid>>;
