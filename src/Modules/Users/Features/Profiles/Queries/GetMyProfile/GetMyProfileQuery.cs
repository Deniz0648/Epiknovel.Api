using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Users.Features.Profiles.Queries.GetMyProfile;

public record GetMyProfileQuery(
    Guid UserId,
    string? IdentityName
) : IRequest<Result<MyProfileResponse>>;
