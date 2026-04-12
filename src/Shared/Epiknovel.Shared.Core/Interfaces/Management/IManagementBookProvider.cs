using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Shared.Core.Interfaces.Management;

public record ManagementBookDto(Guid Id, string Title, string Slug, string AuthorName, string Type, bool IsHidden, bool IsEditorChoice, long ViewCount, string? CoverImageUrl, DateTime CreatedAt);
public record ManagementSimpleDto(Guid Id, string Name, string Slug, string? Description = null, string? IconUrl = null);

public interface IManagementBookProvider
{
    Task<bool> SetBookVisibilityAsync(Guid bookId, bool isVisible, CancellationToken ct = default);
    Task<bool> DeleteBookAsync(Guid bookId, CancellationToken ct = default);
    Task<Result<PagedResult<ManagementBookDto>>> GetBooksAsync(string? type, bool? isHidden, string? searchTerm, int page, int pageSize, CancellationToken ct = default);
    
    // Categories
    Task<List<ManagementSimpleDto>> GetCategoriesAsync(CancellationToken ct = default);
    Task<bool> CreateCategoryAsync(string name, string? description, string? iconUrl, string? slug, CancellationToken ct = default);
    Task<bool> UpdateCategoryAsync(Guid id, string name, string? description, string? iconUrl, string? slug, CancellationToken ct = default);
    Task<bool> DeleteCategoryAsync(Guid id, CancellationToken ct = default);

    // Tags
    Task<List<ManagementSimpleDto>> GetTagsAsync(CancellationToken ct = default);
    Task<bool> CreateTagAsync(string name, string? slug, CancellationToken ct = default);
    Task<bool> UpdateTagAsync(Guid id, string name, string? slug, CancellationToken ct = default);
    Task<bool> DeleteTagAsync(Guid id, CancellationToken ct = default);

    // Translations
    Task<Guid> CreateTranslatedBookAsync(Guid authorId, string title, string description, string? coverImageUrl, int status, int rating, string originalAuthorName, List<Guid> categoryIds, List<string> tags, CancellationToken ct = default);
    Task<ManagementBookDetailsDto?> GetBookDetailsAsync(Guid bookId, CancellationToken ct = default);
    Task<bool> UpdateBookDetailsAsync(Guid bookId, string title, string description, string? coverImageUrl, int status, int rating, string? originalAuthorName, List<Guid> categoryIds, List<string> tags, CancellationToken ct = default);
    // Team Management
    Task<bool> AssignBookMembersAsync(Guid bookId, List<BookMemberAssignmentDto> members, CancellationToken ct = default);
    Task<List<BookMemberAssignmentDto>> GetBookMembersAsync(Guid bookId, CancellationToken ct = default);
}

public record BookMemberAssignmentDto(Guid UserId, string DisplayName, string Role);

public record ManagementBookDetailsDto(
    Guid Id,
    string Title,
    string Description,
    string? CoverImageUrl,
    int Status,
    int ContentRating,
    string? OriginalAuthorName,
    List<Guid> CategoryIds,
    List<string> Tags
);
