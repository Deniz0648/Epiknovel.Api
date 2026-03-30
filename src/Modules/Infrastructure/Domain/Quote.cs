namespace Epiknovel.Modules.Infrastructure.Domain;

public class Quote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Content { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? SourceName { get; set; } // Örn: Hangi kitaptan?
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
