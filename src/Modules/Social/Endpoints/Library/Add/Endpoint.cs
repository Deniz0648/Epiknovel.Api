using FastEndpoints;
using Epiknovel.Modules.Social.Features.Library.Commands.AddToLibrary;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Library.Add;

public record Request
{
    public Guid BookId { get; init; }
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/library");
        Summary(s => {
            s.Summary = "Kitabı kütüphaneye ekle.";
            s.Description = "Seçilen kitabı kullanıcının okuma listesine/kütüphanesine ekler.";
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

        var result = await mediator.Send(new AddToLibraryCommand(userId, req.BookId), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<string>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<string>.Success(result.Message), 200, ct);
    }
}
