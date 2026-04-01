using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetTags;

public record TagDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
}

public record Response
{
    public List<TagDto> Tags { get; init; } = [];
}

public class Endpoint(BooksDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/books/tags");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Kitap etiketlerini listeler.";
            s.Description = "Yazar formundaki etiket önerileri için mevcut etiketleri döndürür.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var tags = await dbContext.Tags
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Take(200)
            .Select(x => new TagDto
            {
                Id = x.Id,
                Name = x.Name,
                Slug = x.Slug
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Tags = tags
        }), 200, ct);
    }
}
