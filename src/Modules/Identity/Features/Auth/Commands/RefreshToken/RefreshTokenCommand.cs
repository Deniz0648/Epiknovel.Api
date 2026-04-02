using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Identity.Features.Auth.Commands.RefreshToken;

public record RefreshTokenCommand(
    string RefreshToken,
    string IpAddress,
    string UserAgent
) : IRequest<Result<RefreshTokenResponse>>;

public record RefreshTokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiryDate
);
