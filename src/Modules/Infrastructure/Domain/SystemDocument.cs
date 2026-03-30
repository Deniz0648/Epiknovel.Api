namespace Epiknovel.Modules.Infrastructure.Domain;

public enum DocumentType
{
    PrivacyPolicy,
    TermsOfService,
    KvkkDisclosure,
    CookiePolicy,
    RefundPolicy
}

public class SystemDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public DocumentType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty; // HTML or Markdown
    
    public string Version { get; set; } = "1.0";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; set; }
}
