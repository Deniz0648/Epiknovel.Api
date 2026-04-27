using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.Comments.Commands.DeleteComment;

public record DeleteCommentCommand(Guid CommentId, Guid UserId) : IRequest<Result<string>>;
