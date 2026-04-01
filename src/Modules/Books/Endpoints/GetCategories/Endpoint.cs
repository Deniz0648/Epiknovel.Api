using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetCategories;

public record CategoryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int DisplayOrder { get; init; }
}

public record Response
{
    public List<CategoryDto> Categories { get; init; } = [];
}

public class Endpoint(BooksDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/books/categories");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Kitap kategorilerini listeler.";
            s.Description = "Kitap oluşturma ve filtreleme ekranları için aktif kategorileri sıralı olarak döndürür.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Name)
            .Select(x => new CategoryDto
            {
                Id = x.Id,
                Name = x.Name,
                Slug = x.Slug,
                Description = x.Description,
                DisplayOrder = x.DisplayOrder
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Categories = categories
        }), 200, ct);
    }
}
