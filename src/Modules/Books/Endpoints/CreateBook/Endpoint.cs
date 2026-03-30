using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.AspNetCore.Builder;

namespace Epiknovel.Modules.Books.Endpoints.CreateBook;

[AuditLog("Yeni Kitap Oluşturuldu")]
public class Endpoint(
    BooksDbContext dbContext, 
    ISlugService slugService,
    IUserProvider userProvider) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books");
        // Varsayılan olarak kimlik doğrulaması gerektirir
        Options(x => x.RequireRateLimiting("StrictPolicy"));
        Summary(s => {
            s.Summary = "Yeni bir kitap/roman oluşturur.";
            s.Description = "Yazar bilgileri token'dan otomatik alınır ve BOLA koruması uygulanır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 0. Yazarlık Yetki Kontrolü (Genel)
        var isAuthor = await userProvider.IsAuthorAsync(req.UserId, ct);
        if (!isAuthor)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap oluşturmak için önce yazar olarak başvurup onay almalısınız."), 403, ct);
            return;
        }

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
            Type = req.Type,
            OriginalAuthorName = req.OriginalAuthorName,
            Categories = categories
        };

        // 4. Etiketleri Ekle (Basit tag yönetimi)
        foreach (var tagName in req.Tags)
        {
            var tag = await dbContext.Tags.FirstOrDefaultAsync(t => t.Name == tagName, ct);
            if (tag == null)
            {
                tag = new Tag { Name = tagName, Slug = Epiknovel.Shared.Core.Common.SlugHelper.ToSlug(tagName) };
            }
            book.Tags.Add(tag);
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

