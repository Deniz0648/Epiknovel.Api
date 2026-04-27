using FastEndpoints;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.PaidAuthor.Status;

public class Endpoint(IAuthorApplicationService authorApplicationService) : EndpointWithoutRequest<Result<PaidAuthorApplicationDto?>>
{
    public override void Configure()
    {
        Get("/paid-author/application-status");
        Policies("BOLA");
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvuru durumunu getir.";
            s.Description = "Kullanıcının varsa aktif ücretli yazarlık başvurusunu ve durumunu döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<PaidAuthorApplicationDto?>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var result = await authorApplicationService.GetUserActivePaidAuthorApplicationAsync(userId, ct);
        
        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(result, 400, ct);
            return;
        }

        await Send.ResponseAsync(result, 200, ct);
    }
}
