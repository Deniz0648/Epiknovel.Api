using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.ReadingProgress.Commands.UpdateReadingProgress;

public record UpdateReadingProgressCommand(
    Guid UserId,
    Guid BookId,
    Guid ChapterId,
    double ScrollPercentage
) : IRequest<Result<string>>;
