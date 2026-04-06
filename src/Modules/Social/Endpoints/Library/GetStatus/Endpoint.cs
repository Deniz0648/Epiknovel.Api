using FastEndpoints;
using Epiknovel.Modules.Social.Features.Library.Queries.GetBookLibraryStatus;
using Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Library.GetStatus;

public class Endpoint(IMediator mediator) : EndpointWithoutRequest<Result<BookLibraryStatusResponse>>
{
    public override void Configure()
    {
        Get("/social/library/check/{bookId}");
        Summary(s => {
            s.Summary = "Kitap kütüphanede mi kontrol et.";
            s.Description = "Belirli bir kitabın kullanıcının kütüphanesinde olup olmadığını ve durumunu döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var bookIdString = Route<string>("bookId");
        if (!Guid.TryParse(bookIdString, out var bookId))
        {
            await Send.ResponseAsync(Result<BookLibraryStatusResponse>.Failure("Geçersiz kitap ID."), 400, ct);
            return;
        }

        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<BookLibraryStatusResponse>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await mediator.Send(new GetBookLibraryStatusQuery(userId, bookId), ct);

        await Send.ResponseAsync(result, 200, ct);
    }
}
