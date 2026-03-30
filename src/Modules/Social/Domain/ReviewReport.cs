using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class ReviewReport : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // ReviewId ile eşleşir
    public Guid ReviewId { get; set; }
    
    // Reportu yapan kullanıcı
    public Guid UserId { get; set; } 
    
    public ReportReason Reason { get; set; }
    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsReviewed { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
}
