using FastEndpoints;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.CreateCategory;

public class Endpoint(BooksDbContext dbContext, ISlugService slugService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books/categories");
        Policies(PolicyNames.AdminAccess); 
        Summary(s => {
            s.Summary = "Yeni bir kitap kategorisi oluşturur.";
            s.Description = "Kategori ismi üzerinden otomatik ve benzersiz bir slug üretir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Benzersiz Slug Üretimi (Merkezi Servis Kullanımı)
        var slug = await slugService.GenerateUniqueSlugAsync(req.Name, dbContext.Categories, ct);

        // 2. Kategori Oluşturma
        var category = new Category
        {
            Name = req.Name,
            Slug = slug,
            Description = req.Description,
            DisplayOrder = req.DisplayOrder
        };

        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(ct);

        // 3. Yanıtı Hazırla
        var response = new Response
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 201, ct);
    }
}

