using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Votes.Commands.AddVote;

public class AddVoteHandler(SocialDbContext dbContext) : IRequestHandler<AddVoteCommand, Result<string>>
{
    public async Task<Result<string>> Handle(AddVoteCommand request, CancellationToken ct)
    {
        var vote = new BookVote
        {
            BookId = request.BookId,
            UserId = request.UserId,
            Value = Math.Max(1, request.Value),
            CreatedAt = DateTime.UtcNow
        };

        dbContext.BookVotes.Add(vote);
        await dbContext.SaveChangesAsync(ct);

        return Result<string>.Success("Oyunuz başarıyla kaydedildi.");
    }
}
