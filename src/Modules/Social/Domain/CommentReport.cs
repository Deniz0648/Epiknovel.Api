using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public enum ReportReason
{
    Spam,
    Harassment,
    Spoiler,
    Inappropriate
}

public class CommentReport : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // InlineCommentId ile eşleşir
    public Guid CommentId { get; set; }

    // Raporlayan UserId
    public Guid UserId { get; set; }

    public string? Description { get; set; }
    public ReportReason Reason { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsReviewed { get; set; }
}
