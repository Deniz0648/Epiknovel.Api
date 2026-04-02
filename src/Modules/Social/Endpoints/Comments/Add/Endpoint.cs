using FastEndpoints;
using Epiknovel.Modules.Social.Features.Comments.Commands.AddComment;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Social.Endpoints.Comments.Add;

public record Request
{
    public Guid? BookId { get; init; }
    public Guid? ChapterId { get; init; }
    public Guid? ParentCommentId { get; init; }
    public string Content { get; init; } = string.Empty;
}

[AuditLog("Yorum Eklendi")]
public class Endpoint(IMediator mediator) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/comments");
        Options(x => x.RequireRateLimiting("SocialPolicy"));
        Summary(s => {
            s.Summary = "Yeni bir yorum ekle.";
            s.Description = "Kitap, bölüm veya başka bir yoruma yeni bir yorum ekler (Dakikada 15 işlem limiti).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new AddCommentCommand(
            userId,
            req.BookId,
            req.ChapterId,
            req.ParentCommentId,
            req.Content
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<Guid>.Failure(result.Message), result.Message.Contains("bulunamadı") ? 404 : 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Guid>.Success(result.Data), 200, ct);
    }
}
