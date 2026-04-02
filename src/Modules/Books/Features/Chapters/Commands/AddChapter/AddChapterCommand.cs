using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Books.Features.Chapters.Commands.AddChapter;

public record AddChapterCommand(
    Guid BookId,
    Guid UserId,
    string Title,
    string Slug,
    int Order,
    bool IsFree,
    int Price,
    ChapterStatus Status,
    bool IsTitleSpoiler,
    DateTime? ScheduledPublishDate,
    List<ChapterLineDto> Lines
) : IRequest<Result<AddChapterResponse>>;

public record ChapterLineDto(Guid Id, string Content, ParagraphType Type);

public record AddChapterResponse(Guid Id, string Slug, string Message);
