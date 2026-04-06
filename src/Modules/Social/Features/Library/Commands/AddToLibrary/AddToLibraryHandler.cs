using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Library.Commands.AddToLibrary;

public class AddToLibraryHandler(SocialDbContext dbContext) : IRequestHandler<AddToLibraryCommand, Result<LibraryItemResponse>>
{
    public async Task<Result<LibraryItemResponse>> Handle(AddToLibraryCommand request, CancellationToken ct)
    {
        var existing = await dbContext.LibraryEntries
            .AnyAsync(e => e.BookId == request.BookId && e.UserId == request.UserId, ct);

        if (existing)
        {
            return Result<LibraryItemResponse>.Failure("Bu kitap zaten kütüphanenizde.");
        }

        var entry = new LibraryEntry
        {
            BookId = request.BookId,
            UserId = request.UserId,
            Status = request.Status.HasValue ? (ReadingStatus)request.Status.Value : ReadingStatus.Reading,
            AddedAt = DateTime.UtcNow
        };

        dbContext.LibraryEntries.Add(entry);
        await dbContext.SaveChangesAsync(ct);

        return Result<LibraryItemResponse>.Success(new LibraryItemResponse
        {
            Id = entry.Id,
            BookId = entry.BookId,
            Status = entry.Status,
            AddedAt = entry.AddedAt,
            LastReadAt = entry.LastReadAt
        });
    }
}
