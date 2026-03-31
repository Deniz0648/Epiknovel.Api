using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Commands.Books;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Books.Handlers;

public class SyncDiscountsCommandHandler(BooksDbContext dbContext) : IRequestHandler<SyncDiscountsCommand, Result<string>>
{
    public async Task<Result<string>> Handle(SyncDiscountsCommand request, CancellationToken ct)
    {
        var query = dbContext.Chapters.AsQueryable();

        if (request.Scope == DiscountScopeType.Book && request.TargetId.HasValue)
        {
            query = query.Where(c => c.BookId == request.TargetId.Value);
        }
        else if (request.Scope == DiscountScopeType.Category && request.TargetId.HasValue)
        {
            query = query.Where(c => c.Book.Categories.Any(cat => cat.Id == request.TargetId.Value));
        }
        // Global affects all

        var chapters = await query.ToListAsync(ct);

        foreach (var chapter in chapters)
        {
            if (!request.IsActive)
            {
                chapter.DiscountedPrice = null;
                continue;
            }

            if (request.ValueType == DiscountValueType.Percentage)
            {
                var discountAmount = (int)Math.Round(chapter.Price * (request.Value / 100m));
                chapter.DiscountedPrice = Math.Max(0, chapter.Price - discountAmount);
            }
            else
            {
                chapter.DiscountedPrice = Math.Max(0, chapter.Price - (int)request.Value);
            }
        }

        await dbContext.SaveChangesAsync(ct);
        return Result<string>.Success("Discount pre-calculation completed.");
    }
}
