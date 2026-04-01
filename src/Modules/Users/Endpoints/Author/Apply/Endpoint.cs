using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.Author.Apply;

public record Request
{
    public string SampleContent { get; init; } = string.Empty;
    public string Experience { get; init; } = string.Empty;
    public string PlannedWork { get; init; } = string.Empty;
}

public class Endpoint(IAuthorApplicationService authorApplicationService) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/author/apply");
        Policies("BOLA");
        Throttle(5, 60);
        Summary(s =>
        {
            s.Summary = "Yazarlık başvurusu yap.";
            s.Description = "Kullanıcının yazarlık başvurusunu oluşturur.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await authorApplicationService.SubmitAuthorApplicationAsync(
            userId,
            req.SampleContent,
            req.Experience,
            req.PlannedWork,
            ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(result, 400, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}

