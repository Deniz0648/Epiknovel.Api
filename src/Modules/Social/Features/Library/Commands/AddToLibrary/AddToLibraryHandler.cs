using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Library.Commands.AddToLibrary;

public class AddToLibraryHandler(SocialDbContext dbContext) : IRequestHandler<AddToLibraryCommand, Result<string>>
{
    public async Task<Result<string>> Handle(AddToLibraryCommand request, CancellationToken ct)
    {
        var existing = await dbContext.LibraryEntries
            .AnyAsync(e => e.BookId == request.BookId && e.UserId == request.UserId, ct);

        if (existing)
        {
            return Result<string>.Failure("Bu kitap zaten kütüphanenizde.");
        }

        var entry = new LibraryEntry
        {
            BookId = request.BookId,
            UserId = request.UserId,
            Status = ReadingStatus.Reading,
            AddedAt = DateTime.UtcNow
        };

        dbContext.LibraryEntries.Add(entry);
        await dbContext.SaveChangesAsync(ct);

        return Result<string>.Success("Kitap kütüphanenize eklendi.");
    }
}
