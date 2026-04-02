using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Identity.Features.Auth.Commands.Login;

public record LoginCommand(
    string Email,
    string Password,
    string IpAddress,
    string UserAgent
) : IRequest<Result<LoginResponse>>;

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiryDate,
    MyProfileResponse Profile
);
