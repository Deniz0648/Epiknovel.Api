using FastEndpoints;
using Epiknovel.Modules.Social.Features.Votes.Commands.AddVote;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Social.Endpoints.Votes.Add;

public record Request
{
    public Guid BookId { get; init; }
    public int Value { get; init; }
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/votes");
        Summary(s => {
            s.Summary = "Kitaba oy ver (Sıralama için).";
            s.Description = "Haftalık/Aylık sıralamalar için kitaba oy verir (Güç taşı vb. mantığı).";
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

        var result = await mediator.Send(new AddVoteCommand(userId, req.BookId, req.Value), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<string>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<string>.Success(result.Message), 200, ct);
    }
}
