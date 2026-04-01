using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.AspNetCore.Builder;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Endpoints.CreateBook;

[AuditLog("Yeni Kitap Oluşturuldu")]
public class Endpoint(
    BooksDbContext dbContext, 
    ISlugService slugService,
    IUserProvider userProvider,
    IPermissionService permissionService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books");
        Policies(PolicyNames.AuthorContentAccess);
        // Varsayılan olarak kimlik doğrulaması gerektirir
        Options(x => x.RequireRateLimiting("StrictPolicy"));
        Summary(s => {
            s.Summary = "Yeni bir kitap/roman oluşturur.";
            s.Description = "Yazar bilgileri token'dan otomatik alınır ve BOLA koruması uygulanır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 0. İş kuralları: onaylı yazar profili olmadan içerik üretilemez
        if (!await userProvider.IsAuthorAsync(req.UserId, ct))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap oluşturmak için önce yazar olarak başvurup onay almalısınız."), 403, ct);
            return;
        }

        // Author create akışında çeviri eser açılamaz.
        // Bu alanlar sadece yönetim tarafındaki ayrı akışlarda kullanılmalıdır.
        var isAdmin = await permissionService.HasPermissionAsync(User, PermissionNames.AdminAccess, ct);
        // Yazarlar hem orijinal hem çeviri eser açabilmelidir.
        var resolvedType = req.Type; 
        var resolvedOriginalAuthorName = resolvedType == BookType.Translation
            ? req.OriginalAuthorName?.Trim()
            : null;

        // 1. Benzersiz Slug Üret (Title üzerinden)
        var slug = await slugService.GenerateUniqueSlugAsync(req.Title, dbContext.Books, ct);

        // 2. Kategorileri Hazırla
        var categories = await dbContext.Categories
            .Where(x => req.CategoryIds.Contains(x.Id))
            .ToListAsync(ct);

        // 3. Kitabı Oluştur
        var book = new Book
        {
            AuthorId = req.UserId, // BOLAValidationPreProcessor tarafından token'dan dolduruldu
            Title = req.Title,
            Slug = slug,
            Description = req.Description,
            CoverImageUrl = req.CoverImageUrl,
            Status = req.Status,
            ContentRating = req.ContentRating,
            Type = resolvedType,
            OriginalAuthorName = resolvedOriginalAuthorName,
            Categories = categories
        };

        // 4. Etiketleri Ekle (N+1 önleme: tek sorguda mevcutları çek, eksikleri toplu oluştur)
        var normalizedTagNames = req.Tags
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
                    Slug = Epiknovel.Shared.Core.Common.SlugHelper.ToSlug(tagName)
                })
                .ToList();

            if (missingTags.Count > 0)
            {
                dbContext.Tags.AddRange(missingTags);
            }

            foreach (var tag in existingTags)
            {
                book.Tags.Add(tag);
            }

            foreach (var tag in missingTags)
            {
                book.Tags.Add(tag);
            }
        }

        dbContext.Books.Add(book);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Id = book.Id,
            Slug = book.Slug,
            Message = "Kitabınız başarıyla oluşturuldu."
        }), 201, ct);
    }
}

