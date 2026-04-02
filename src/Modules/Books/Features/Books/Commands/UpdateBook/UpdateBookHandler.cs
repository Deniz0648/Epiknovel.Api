using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Common;

namespace Epiknovel.Modules.Books.Features.Books.Commands.UpdateBook;

public class UpdateBookHandler(
    BooksDbContext dbContext,
    ISlugService slugService) : IRequestHandler<UpdateBookCommand, Result<UpdateBookResponse>>
{
    public async Task<Result<UpdateBookResponse>> Handle(UpdateBookCommand request, CancellationToken ct)
    {
        var book = await dbContext.Books
            .Include(x => x.Categories)
            .Include(x => x.Tags)
            .FirstOrDefaultAsync(x => x.Id == request.Id, ct);

        if (book == null)
        {
            return Result<UpdateBookResponse>.Failure("Kitap bulunamadı.");
        }

        // BOLA Check (Handled by PreProcessor but verified here for extra safety)
        if (book.AuthorId != request.UserId)
        {
            return Result<UpdateBookResponse>.Failure("Bu kitabı güncelleme yetkiniz yok.");
        }

        if (book.Title != request.Title)
        {
            book.Title = request.Title;
            book.Slug = await slugService.GenerateUniqueSlugAsync(book.Title, dbContext.Books, ct);
        }
        
        book.Description = request.Description;
        book.CoverImageUrl = request.CoverImageUrl;
        book.Status = request.Status;
        book.ContentRating = request.ContentRating;

        // Categories
        book.Categories.Clear();
        var categories = await dbContext.Categories
            .Where(x => request.CategoryIds.Contains(x.Id))
            .ToListAsync(ct);
        foreach (var category in categories) book.Categories.Add(category);

        // Tags
        book.Tags.Clear();
        var normalizedTagNames = request.Tags
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedTagNames.Count > 0)
        {
            var existingTags = await dbContext.Tags
                .Where(t => normalizedTagNames.Contains(t.Name))
                .ToListAsync(ct);

            var existingTagNames = existingTags
                .Select(t => t.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingTags = normalizedTagNames
                .Where(tagName => !existingTagNames.Contains(tagName))
                .Select(tagName => new Tag
                {
                    Name = tagName,
                    Slug = SlugHelper.ToSlug(tagName)
                })
                .ToList();

            if (missingTags.Count > 0)
            {
                dbContext.Tags.AddRange(missingTags);
            }

            foreach (var tag in existingTags) book.Tags.Add(tag);
            foreach (var tag in missingTags) book.Tags.Add(tag);
        }

        await dbContext.SaveChangesAsync(ct);

        return Result<UpdateBookResponse>.Success(new UpdateBookResponse("Kitap başarıyla güncellendi.", book.Slug));
    }
}
