using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Shared.Core.Commands.Identity;

public record GenerateImpersonationTokenCommand(Guid TargetUserId, Guid ActorAdminId) : IRequest<Result<string>>;
