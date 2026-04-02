using FastEndpoints;
using Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentList;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Endpoints.Comments.GetList;

public record Request
{
    public Guid? BookId { get; init; }
    public Guid? ChapterId { get; init; }
    public int Page { get; init; } = 1;
    public int Size { get; init; } = 20;
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<List<CommentItemResponse>>>
{
    public override void Configure()
    {
        Get("/social/comments");
        AllowAnonymous();
        ResponseCache(60); 
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
            req.Page,
            req.Size
        ), ct);

        await Send.ResponseAsync(result, 200, ct);
    }
}
