using FastEndpoints;
using Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentList;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Endpoints.Comments.GetList;

public record Request
{
    public Guid? BookId { get; init; }
    public Guid? ChapterId { get; init; }
    public string? ParagraphId { get; init; }
    public Guid? ParentCommentId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; }
    public bool IncludeSpoilers { get; init; }
}

public class Endpoint(IMediator mediator, IUserProvider userProvider) : Endpoint<Request, Result<CommentListResponse>>
{
    public override void Configure()
    {
        Get("/social/comments");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Yorum listesini getir.";
            s.Description = "Bir kitap veya bölüme ait yorumları hiyerarşik (ana ve alt yorumlar) şekilde listeler. N+1 optimizasyonu içerir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await mediator.Send(new GetCommentListQuery(
            req.BookId,
            req.ChapterId,
            req.ParagraphId,
            req.ParentCommentId,
            req.Page,
            req.PageSize,
            req.SortBy,
            req.IncludeSpoilers,
            userProvider.GetCurrentUserId()
        ), ct);

        await Send.ResponseAsync(result, 200, ct);
    }
}
