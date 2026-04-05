using FastEndpoints;
using Epiknovel.Modules.Social.Features.Library.Commands.UpsertReadingProgress;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Library.UpsertProgress;

public record Request
{
    public Guid BookId { get; init; }
    public Guid ChapterId { get; init; }
    public string ChapterSlug { get; init; } = string.Empty;
    public int ChapterOrder { get; init; }
    public Guid? ParagraphId { get; init; }
    public int? TotalChapters { get; init; }
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/library/progress");
        Summary(s => {
            s.Summary = "Okuma ilerlemesini kaydet.";
            s.Description = "Kullanıcının kitap üzerindeki son kaldığı bölüm ve paragraf bilgisini günceller.";
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

        var result = await mediator.Send(new UpsertReadingProgressCommand(
            userId,
            req.BookId,
            req.ChapterId,
            req.ChapterSlug,
            req.ChapterOrder,
            req.ParagraphId,
            req.TotalChapters
        ), ct);

        await Send.ResponseAsync(result, 200, ct);
    }
}
