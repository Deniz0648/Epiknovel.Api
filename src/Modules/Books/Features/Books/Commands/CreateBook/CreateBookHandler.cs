using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Common;
using Epiknovel.Shared.Core.Events;

using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Features.Books.Commands.CreateBook;

public class CreateBookHandler(
    BooksDbContext dbContext,
    ISlugService slugService,
    IUserProvider userProvider,
    ISystemSettingProvider settingProvider) : IRequestHandler<CreateBookCommand, Result<CreateBookResponse>>
{
    public async Task<Result<CreateBookResponse>> Handle(CreateBookCommand request, CancellationToken ct)
    {
        // 🚀 API-LEVEL GUARD: Yeni kitap oluşturma kısıtlaması
        if (request.Type != BookType.Translation)
        {
            var allowNewBooks = await settingProvider.GetSettingValueAsync<bool>("CONTENT_AllowNewBooks", ct);
            if (!allowNewBooks)
            {
                return Result<CreateBookResponse>.Failure("Şu anda yeni (orijinal) kitap oluşturulması sistem genelinde geçici olarak durdurulmuştur.");
            }
        }

        var profileResult = await userProvider.GetProfileAsync(request.AuthorId, null, ct);
        if (!profileResult.IsSuccess || profileResult.Data == null || !profileResult.Data.IsAuthor)
        {
            return Result<CreateBookResponse>.Failure("Kitap oluşturmak için önce yazar olarak başvurup onay almalısınız.");
        }

        var authorName = profileResult.Data.DisplayName;

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
        
        // 🚀 OUTBOX ENQUEUE: Arama indeksi için olayı kuyruğa at
        dbContext.EnqueueOutboxMessage(new BookUpdatedEvent(
            book.Id,
            book.Title,
            book.Description,
            book.Slug,
            book.CoverImageUrl,
            authorName,
            book.Categories.Select(c => c.Name),
            book.Tags.Select(t => t.Name),
            book.IsHidden,
            false // IsDeleted
        ));

        await dbContext.SaveChangesAsync(ct);

        return Result<CreateBookResponse>.Success(new CreateBookResponse(book.Id, book.Slug, "Kitabınız başarıyla oluşturuldu."));
    }
}
