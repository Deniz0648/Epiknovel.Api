using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Common;

namespace Epiknovel.Modules.Books.Features.Books.Commands.CreateBook;

public class CreateBookHandler(
    BooksDbContext dbContext,
    ISlugService slugService,
    IUserProvider userProvider) : IRequestHandler<CreateBookCommand, Result<CreateBookResponse>>
{
    public async Task<Result<CreateBookResponse>> Handle(CreateBookCommand request, CancellationToken ct)
    {
        // 1. İş kuralları: onaylı yazar profili olmadan içerik üretilemez
        if (!await userProvider.IsAuthorAsync(request.AuthorId, ct))
        {
            return Result<CreateBookResponse>.Failure("Kitap oluşturmak için önce yazar olarak başvurup onay almalısınız.");
        }

        // 2. Benzersiz Slug Üret (Title üzerinden)
        var slug = await slugService.GenerateUniqueSlugAsync(request.Title, dbContext.Books, ct);

        // 3. Kategorileri Hazırla
        var categories = await dbContext.Categories
            .Where(x => request.CategoryIds.Contains(x.Id))
            .ToListAsync(ct);

        // 4. Kitabı Oluştur
        var book = new Book
        {
            AuthorId = request.AuthorId,
            Title = request.Title,
            Slug = slug,
            Description = request.Description,
            CoverImageUrl = request.CoverImageUrl,
            Status = request.Status,
            ContentRating = request.ContentRating,
            Type = request.Type,
            OriginalAuthorName = request.Type == BookType.Translation ? request.OriginalAuthorName?.Trim() : null,
            Categories = categories
        };

        // 5. Etiketleri Ekle
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

        dbContext.Books.Add(book);
        await dbContext.SaveChangesAsync(ct);

        return Result<CreateBookResponse>.Success(new CreateBookResponse(book.Id, book.Slug, "Kitabınız başarıyla oluşturuldu."));
    }
}
