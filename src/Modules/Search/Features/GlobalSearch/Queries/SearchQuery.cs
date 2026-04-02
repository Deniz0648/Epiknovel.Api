using Epiknovel.Modules.Search.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Search.Features.GlobalSearch.Queries;

public record GlobalSearchQuery(
    string Q,
    DocumentType? Type = null,
    int Page = 1,
    int Size = 20,
    string? UserId = null
) : IRequest<Result<GlobalSearchResponse>>;

public record GlobalSearchResponse(IEnumerable<SearchResultDto> Results, int TotalCount, int TotalPages);

public record SearchResultDto(
    Guid Id,
    Guid ReferenceId,
    DocumentType Type,
    string Title,
    string? Description,
    string Slug,
    string? ImageUrl
);
