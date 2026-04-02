using FastEndpoints;
using Epiknovel.Modules.Social.Features.ReadingProgress.Commands.UpdateReadingProgress;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;

namespace Epiknovel.Modules.Social.Endpoints.ReadingProgress.Update;

public record Request
{
    public Guid BookId { get; init; }
    public Guid ChapterId { get; init; }
    public double ScrollPercentage { get; init; }
}

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/social/reading-progress");
        Options(x => x.RequireRateLimiting("ProgressPolicy"));
        Summary(s => {
            s.Summary = "Okuma ilerlemesini güncelle.";
            s.Description = "Kullanıcının okuma sırasında kaldığı satırı/yüzdeyi kaydeder (10 saniyede bir eşitleme limiti).";
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

        var result = await mediator.Send(new UpdateReadingProgressCommand(
            userId,
            req.BookId,
            req.ChapterId,
            req.ScrollPercentage
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<string>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<string>.Success(result.Message), 200, ct);
    }
}
