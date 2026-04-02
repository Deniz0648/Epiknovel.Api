using FastEndpoints;
using Epiknovel.Modules.Users.Features.Profiles.Queries.GetMyProfile;
using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.GetMyProfile;

public class Endpoint(IMediator mediator) : EndpointWithoutRequest<Result<MyProfileResponse>>
{
    public override void Configure()
    {
        Get("/users/me");
        Policies("BOLA"); // Require session
        Summary(s => {
            s.Summary = "Kendi profil detaylarını getir.";
            s.Description = "Giriş yapan kullanıcının kendi profilini görmesini sağlar. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<MyProfileResponse>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var result = await mediator.Send(new GetMyProfileQuery(
            userId,
            User.Identity?.Name
        ), ct);

        await Send.ResponseAsync(result, 200, ct);
    }
}
