using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Compliance.Domain;

public class LegalDocumentVersion : BaseEntity
{
    public Guid DocumentId { get; set; }
    public LegalDocument Document { get; set; } = default!;

    public string Content { get; set; } = string.Empty;
    public string VersionNumber { get; set; } = "1.0";
    public string ChangeNote { get; set; } = string.Empty;
    
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Guid? PublishedByUserId { get; set; }
}
