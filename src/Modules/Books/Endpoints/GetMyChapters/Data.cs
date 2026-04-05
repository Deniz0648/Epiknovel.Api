using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.GetMyChapters;

public class Request : PaginationRequest
{
    public string BookSlug { get; set; } = string.Empty;
    public string? Search { get; set; }
    public ChapterStatus? Status { get; set; }
}

public class Response 
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int Order { get; set; }
    public int WordCount { get; set; }
    public ChapterStatus Status { get; set; }
    public int Price { get; set; }
    public bool IsFree { get; set; }
    public long ViewCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ScheduledPublishDate { get; set; }
}
