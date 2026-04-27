using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Compliance.Domain;

public class LegalDocument : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty; // unique slug like "terms-of-service"
    public string Description { get; set; } = string.Empty;

    public ICollection<LegalDocumentVersion> Versions { get; set; } = new List<LegalDocumentVersion>();
}
