using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;

namespace Epiknovel.Modules.Identity.Features.Auth.Queries.GetSession;

public class GetSessionHandler(IUserProvider userProvider) : IRequestHandler<GetSessionQuery, Result<MyProfileResponse>>
{
    public async Task<Result<MyProfileResponse>> Handle(GetSessionQuery request, CancellationToken ct)
    {
        return await userProvider.GetProfileAsync(request.UserId, request.User.Identity?.Name, ct);
    }
}
