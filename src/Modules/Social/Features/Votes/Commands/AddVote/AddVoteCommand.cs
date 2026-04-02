using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.Votes.Commands.AddVote;

public record AddVoteCommand(
    Guid UserId,
    Guid BookId,
    int Value
) : IRequest<Result<string>>;
