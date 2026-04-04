using Epiknovel.Modules.Search.Data;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using StackExchange.Redis;

namespace Epiknovel.Modules.Search.Features.GlobalSearch.Queries;

public partial class GlobalSearchHandler(SearchDbContext dbContext, IConnectionMultiplexer redisMultiplexer) : IRequestHandler<GlobalSearchQuery, Result<GlobalSearchResponse>>
{
    public async Task<Result<GlobalSearchResponse>> Handle(GlobalSearchQuery request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Q) || request.Q.Length < 2)
        {
            return Result<GlobalSearchResponse>.Failure("Arama terimi en az 2 karakter olmalıdır.");
        }

        var safeQuery = SanitizeQuery(request.Q);
        var searchTerms = safeQuery.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        // FTS Prefix Search
        var tsQueryString = string.Join(" & ", searchTerms.Select(t => $"{t}:*"));

        var queryable = dbContext.SearchDocuments
            .AsNoTracking()
            .Where(d => d.IsActive);

        if (request.Type.HasValue)
        {
            queryable = queryable.Where(d => d.Type == request.Type.Value);
        }

        // Apply FTS with Unaccent support for Turkish characters
        // Database index is generated with 'unaccent', so the query must also be unaccented.
        queryable = queryable.Where(d => 
            d.SearchVector.Matches(EF.Functions.ToTsQuery("simple", EF.Functions.Unaccent(tsQueryString))));

        // Rank and Score (Also using unaccent for accurate scoring)
        var orderedQuery = queryable.OrderByDescending(d => 
            d.SearchVector.Rank(EF.Functions.ToTsQuery("simple", EF.Functions.Unaccent(tsQueryString))));

        var totalRecords = await orderedQuery.CountAsync(ct);
        var totalPages = (int)Math.Ceiling((double)totalRecords / request.Size);

        var documents = await orderedQuery
            .Skip((request.Page - 1) * request.Size)
            .Take(request.Size)
            .ToListAsync(ct);

        // Background Analytics Offloading
        await LogAnalytics(request, totalRecords);

        var results = documents.Select(d => new SearchResultDto(
            Id: d.Id,
            ReferenceId: d.ReferenceId,
            Type: d.Type,
            Title: d.Title,
            Description: d.Description,
            Slug: d.Slug,
            ImageUrl: d.ImageUrl
        ));

        return Result<GlobalSearchResponse>.Success(new GlobalSearchResponse(results, totalRecords, totalPages));
    }

    private async Task LogAnalytics(GlobalSearchQuery request, int totalRecords)
    {
        var telemetry = new 
        {
            Query = request.Q,
            ResultCount = totalRecords,
            UserId = request.UserId ?? Guid.Empty.ToString(),
            Timestamp = DateTime.UtcNow
        };

        var redis = redisMultiplexer.GetDatabase();
        _ = redis.ListRightPushAsync("epiknovel:analytics:search", System.Text.Json.JsonSerializer.Serialize(telemetry));
    }

    [GeneratedRegex(@"[^\w\sşğüöçıŞĞÜÖÇİ\-]")]
    private static partial Regex AlphanumericRegex();

    private static string SanitizeQuery(string q)
    {
        var sanitized = AlphanumericRegex().Replace(q, " ");
        return Regex.Replace(sanitized, @"\s+", " ").Trim();
    }
}
