using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Modules.Search.Data;
using Epiknovel.Modules.Search.Domain;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Search.Endpoints.GlobalSearch;

public record Request
{
    public string Q { get; set; } = string.Empty;
    public DocumentType? Type { get; set; } // Sadece yazar veya sadece kitap aramak için
    public int Page { get; set; } = 1;
    public int Size { get; set; } = 20;
}

public record Response(IEnumerable<SearchResultDto> Results, int TotalCount, int TotalPages);

public record SearchResultDto(
    Guid Id,
    Guid ReferenceId,
    DocumentType Type,
    string Title,
    string? Description,
    string Slug,
    string? ImageUrl
);

public partial class Endpoint(SearchDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/search");
        AllowAnonymous();
        // RateLimiting: Saniyede çok fazla arama yapılmasını engellemek için önceden tanımlı kural:
        Options(x => x.RequireRateLimiting("GlobalPolicy")); 
        Summary(s => {
            s.Summary = "Global arama yap.";
            s.Description = "PostgreSQL Full-Text Search altyapısını kullanarak site genelinde kitap, yazar ve kategori araması yapar. Hızlı ve optimize edilmiş sonuçlar döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Q) || req.Q.Length < 2)
        {
            var errors = new List<string> { "Arama terimi en az 2 karakter olmalıdır." };
            await Send.ResponseAsync(Result<Response>.Failure("Geçersiz arama terimi.", errors), 400, ct);
            return;
        }

        // 1. PostgreSQL FTS Güvenliği: Bozuk string'lerin FTS'yi kırmasını engellemek için ReGex.
        // Aslında 'EF.Functions.WebSearchToTsQuery' çok güvenlidir ancak biz temiz tutmak istiyoruz.
        var safeQuery = SanitizeQuery(req.Q);

        var queryable = dbContext.SearchDocuments
            .Where(d => d.IsActive);

        if (req.Type.HasValue)
        {
            queryable = queryable.Where(d => d.Type == req.Type.Value);
        }

        // 2. Full-Text Search (Milisaniyelik arama)
        // Kullanıcının girdiği kelimelerin 'ile başlayan' halini de aramak için prefix search ( :* ) ekliyoruz.
        var searchTerms = safeQuery.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var tsQueryString = string.Join(" & ", searchTerms.Select(t => $"{t}:*"));

        queryable = queryable.Where(d => 
            d.SearchVector.Matches(EF.Functions.ToTsQuery("simple", tsQueryString)));

        // 3. Sıralama ve Sayfalama
        // Ağırlıklarına göre (A=Title, vb.) rank fonksiyonu:
        var orderedQuery = queryable.OrderByDescending(d => d.SearchVector.Rank(EF.Functions.ToTsQuery("simple", tsQueryString)));

        var totalRecords = await orderedQuery.CountAsync(ct);
        var totalPages = (int)Math.Ceiling((double)totalRecords / req.Size);

        var documents = await orderedQuery
            .Skip((req.Page - 1) * req.Size)
            .Take(req.Size)
            .ToListAsync(ct);

        // 4. Log (SearchHistory) - Failsafe olarak asenkron de gönderebilirdik ancak basitleştirelim
        dbContext.SearchHistories.Add(new SearchHistory
        {
            Query = req.Q,
            ResultCount = totalRecords,
            UserId = User.Identity?.IsAuthenticated == true ? Guid.Parse(User.FindFirst("UserId")?.Value ?? Guid.Empty.ToString()) : Guid.Empty
        });
        await dbContext.SaveChangesAsync(ct);

        // 5. Response Mapping
        var results = documents.Select(d => new SearchResultDto(
            Id: d.Id,
            ReferenceId: d.ReferenceId,
            Type: d.Type,
            Title: d.Title,
            Description: d.Description,
            Slug: d.Slug,
            ImageUrl: d.ImageUrl
        ));

        await Send.ResponseAsync(Result<Response>.Success(new Response(results, totalRecords, totalPages)), 200, ct);
    }

    [GeneratedRegex(@"[^\w\sşğüöçıŞĞÜÖÇİ\-]")]
    private static partial Regex AlphanumericRegex();

    private static string SanitizeQuery(string q)
    {
        // Yalnızca harfler, sayılar, Türkçe karakterler ve boşluklar.
        var sanitized = AlphanumericRegex().Replace(q, " ");
        
        // Fazla boşlukları teke indir
        return Regex.Replace(sanitized, @"\s+", " ").Trim();
    }
}
