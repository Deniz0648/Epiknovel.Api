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

public class Endpoint(IAuthorApplicationService authorApplicationService, ISystemSettingProvider settings) : Endpoint<Request, Result<object>>
{
    public override void Configure()
    {
        Post("/author/apply");
        Get("/author/apply");
        Policies("BOLA");
        Throttle(5, 60);
        Summary(s =>
        {
            s.Summary = "Yazarlık başvurusu işlemleri.";
            s.Description = "Yazarlık başvurusu yapar veya mevcut başvuru durumunu sorgular.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<object>.Failure("Unauthorized"), 401, ct);
            return;
        }

        if (HttpContext.Request.Method == "GET")
        {
            var statusResult = await authorApplicationService.GetUserActiveApplicationAsync(userId, ct);
            await Send.ResponseAsync(Result<object>.Success(statusResult.Data ?? (object)new { }), 200, ct);
            return;
        }

        // 🚀 GLOBAL SETTING CHECK
        if (!User.IsInRole("Admin") && !User.IsInRole("SuperAdmin"))
        {
            var allowApplications = await settings.GetSettingValueAsync<string>("CONTENT_AllowAuthorApplications", ct);
            if (allowApplications == "false")
            {
                await Send.ResponseAsync(Result<object>.Failure("Şu anda yazarlık başvuruları geçici olarak kapalıdır."), 403, ct);
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
            await Send.ResponseAsync(Result<object>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<object>.Success(result.Data ?? (object)new { }), 200, ct);
    }
}

