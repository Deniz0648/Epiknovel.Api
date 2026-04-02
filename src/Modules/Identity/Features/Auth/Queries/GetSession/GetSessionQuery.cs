using Epiknovel.Shared.Core.Models;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Identity.Features.Auth.Queries.GetSession;

public record GetSessionQuery(Guid UserId, ClaimsPrincipal User) : IRequest<Result<MyProfileResponse>>;
