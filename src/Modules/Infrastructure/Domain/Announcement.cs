using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Infrastructure.Domain;

public class Announcement : BaseEntity, ISoftDelete
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty; // HTML or MD
    public string? ImageUrl { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool IsPinned { get; set; }
    
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}
