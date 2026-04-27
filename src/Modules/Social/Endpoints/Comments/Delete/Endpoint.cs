using FastEndpoints;
using Epiknovel.Modules.Social.Features.Comments.Commands.DeleteComment;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Delete;

public record Request
{
    public Guid CommentId { get; init; }
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Delete("/social/comments/{commentId}");
        Summary(s => {
            s.Summary = "Yorumu sil.";
            s.Description = "Kullanıcının kendi yaptığı bir yorumu silmesini sağlar (Soft delete).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new DeleteCommentCommand(req.CommentId, userId), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<string>.Failure(result.Message), result.Message.Contains("bulunamadı") ? 404 : 403, ct);
            return;
        }

        await Send.ResponseAsync(Result<string>.Success(result.Data ?? string.Empty), 200, ct);
    }
}
