using FastEndpoints;
using Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Epiknovel.Modules.Social.Domain;

namespace Epiknovel.Modules.Social.Endpoints.Library.GetList;

public record Request
{
    public ReadingStatus? Status { get; init; }
    public int Page { get; init; } = 1;
    public int Size { get; init; } = 20;
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<List<LibraryItemResponse>>>
{
    public override void Configure()
    {
        Get("/social/library");
        Summary(s => {
            s.Summary = "Kendi kütüphanemi listele.";
            s.Description = "Kullanıcının kütüphanesindeki kitapları status bazlı filtreleyerek getirir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<List<LibraryItemResponse>>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new GetLibraryListQuery(
            userId,
            req.Status,
            req.Page,
            req.Size
        ), ct);

        await Send.ResponseAsync(result, 200, ct);
    }
}
