using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Shared.Core.Commands.Wallet;

public record DeductBalanceForPayoutCommand(Guid UserId, decimal Amount, Guid PayoutRequestId) : IRequest<Result<string>>;
