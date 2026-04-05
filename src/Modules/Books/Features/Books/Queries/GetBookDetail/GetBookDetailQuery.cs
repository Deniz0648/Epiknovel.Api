using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Features.Books.Queries.GetBookDetail;

public record GetBookDetailQuery(string Slug, Guid RequestingUserId) : IRequest<Result<BookDetailResponse>>;

public record BookDetailResponse
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? CoverImageUrl { get; init; }
    public Guid AuthorId { get; init; }
    public string AuthorName { get; init; } = "Yazar";
    public string Status { get; init; } = string.Empty;
    public string ContentRating { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public int VoteCount { get; init; }
    public double AverageRating { get; init; }
    public long ViewCount { get; init; }
    public DateTime CreatedAt { get; init; }
    public List<CategoryDto> Categories { get; init; } = new();
    public List<string> Tags { get; init; } = new();
    public int? UserRating { get; init; } // Kullanıcının verdiği puan
}

public record CategoryDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
}
