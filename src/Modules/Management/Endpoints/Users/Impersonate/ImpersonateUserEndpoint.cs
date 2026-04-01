using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Commands.Identity;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Management.Endpoints.Users.Impersonate;

public record ImpersonateUserRequest { public Guid UserId { get; init; } }

[AuditLog("User Impersonation Started")]
public class ImpersonateUserEndpoint(IMediator mediator) : Endpoint<ImpersonateUserRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/users/{UserId}/impersonate");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Start user impersonation session";
            s.Description = "Generates a specialized JWT representing the target user, with IsImpersonated=true claim. Limited duration.";
        });
    }

    public override async Task HandleAsync(ImpersonateUserRequest req, CancellationToken ct)
    {
        var adminIdStr = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(adminIdStr, out var adminId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized: Admin ID not found in claims."), 401, ct);
            return;
        }

        var result = await mediator.Send(new GenerateImpersonationTokenCommand(req.UserId, adminId), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(result, 400, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
