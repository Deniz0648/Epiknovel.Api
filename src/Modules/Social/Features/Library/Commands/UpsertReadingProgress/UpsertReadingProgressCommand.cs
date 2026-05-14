using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.Library.Commands.UpsertReadingProgress;

public record UpsertReadingProgressCommand(
    Guid UserId,
    Guid BookId,
    Guid ChapterId,
    string ChapterSlug,
    string ChapterTitle,
    int ChapterOrder,
    Guid? ParagraphId,
    int? TotalChapters = null
) : IRequest<Result<Guid>>;
