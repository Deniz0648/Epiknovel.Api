using System.ComponentModel.DataAnnotations.Schema;

namespace Epiknovel.Modules.Social.Domain;

public class BookSummary
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
}
