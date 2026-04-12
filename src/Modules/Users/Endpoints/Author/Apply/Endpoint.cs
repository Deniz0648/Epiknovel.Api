using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

using Epiknovel.Shared.Core.Interfaces.Management;

namespace Epiknovel.Modules.Users.Endpoints.Author.Apply;

public record Request
{
    public string SampleContent { get; init; } = string.Empty;
    public string Experience { get; init; } = string.Empty;
    public string PlannedWork { get; init; } = string.Empty;
}

public class Endpoint(IAuthorApplicationService authorApplicationService, ISystemSettingProvider settings) : Endpoint<Request, Result<string>>
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

        // 🚀 GLOBAL SETTING CHECK
        if (!User.IsInRole("Admin") && !User.IsInRole("SuperAdmin"))
        {
            var allowApplications = await settings.GetSettingValueAsync<string>("CONTENT_AllowAuthorApplications", ct);
            if (allowApplications == "false")
            {
                await Send.ResponseAsync(Result<string>.Failure("Şu anda yazarlık başvuruları geçici olarak kapalıdır."), 403, ct);
                return;
            }
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

