using FastEndpoints;
using Epiknovel.Modules.Identity.Features.Auth.Queries.GetSession;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Identity.Endpoints.Session;

public class Endpoint(IMediator mediator) : EndpointWithoutRequest<Result<MyProfileResponse>>
{
    public override void Configure()
    {
        Get("/auth/session");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Mevcut oturumun profil bilgilerini getirir.";
            s.Description = "Giriş yapmış kullanıcının profil detaylarını ve yetkilerini tek sorguda çeker. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(new Result<MyProfileResponse> { IsSuccess = true, Data = null }, 200, ct);
            return;
        }

        var result = await mediator.Send(new GetSessionQuery(userId, User), ct);
        
        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(new Result<MyProfileResponse> { IsSuccess = true, Data = null }, 200, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
