using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Identity.Features.Auth.Commands.Register;

public record RegisterUserCommand(
    string Email,
    string Password,
    string? DisplayName,
    string BaseUrl
) : IRequest<Result<RegisterUserResponse>>;

public record RegisterUserResponse(string Message);
