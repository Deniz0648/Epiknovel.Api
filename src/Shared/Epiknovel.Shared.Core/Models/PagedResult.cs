namespace Epiknovel.Shared.Core.Models;

public class PagedResult<T>
{
    [System.Text.Json.Serialization.JsonPropertyName("items")]
    public List<T> Items { get; set; } = new();
    [System.Text.Json.Serialization.JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("pageNumber")]
    public int PageNumber { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("pageSize")]
    public int PageSize { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("hasNextPage")]
    public bool HasNextPage { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("hasPreviousPage")]
    public bool HasPreviousPage { get; set; }

    public static PagedResult<T> Create(List<T> items, int totalCount, int pageNumber, int pageSize)
    {
        var totalPages = pageSize > 0 ? (int)Math.Ceiling(totalCount / (double)pageSize) : 0;
        return new PagedResult<T>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalPages,
            HasNextPage = pageNumber < totalPages,
            HasPreviousPage = pageNumber > 1
        };
    }
}
