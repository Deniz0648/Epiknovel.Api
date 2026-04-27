using FastEndpoints;
using Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentContent;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Reveal;

public record Request
{
    public Guid CommentId { get; init; }
    public string Token { get; init; } = string.Empty;
}

public record Response(string Content);

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/social/comments/{commentId:guid}/reveal");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Spoiler içeriğini göster.";
            s.Description = "Token kullanarak spoiler olan yorumun orijinal içeriğini getirir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await mediator.Send(new GetCommentContentQuery(req.Token), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response(result.Data ?? string.Empty)), 200, ct);
    }
}
