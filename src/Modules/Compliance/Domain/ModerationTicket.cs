using System;
using System.Collections.Generic;
using Epiknovel.Shared.Core.Enums;

namespace Epiknovel.Modules.Compliance.Domain;

public enum TicketStatus
{
    Pending,
    UnderReview,
    Resolved,
    Ignored
}

public class ModerationTicket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // Şikayet edilen içeriğin kimliği
    public Guid ContentId { get; set; }
    public TargetContentType ContentType { get; set; }
    
    // İlk / Ana şikayet sebebi
    public ReportReason TopReason { get; set; }
    public string? InitialDescription { get; set; }
    
    // Eşzamanlılık ve Tekrar şikayet kontrolü için
    public int ReportCount { get; set; } = 1;
    public List<Guid> ReporterIds { get; set; } = new();
    
    public TicketStatus Status { get; set; } = TicketStatus.Pending;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    
    // Bileti çözen admin (varsa)
    public Guid? ResolvedByAdminId { get; set; }
    public string? ResolutionAction { get; set; } // Örn: "DeletedContent", "WarnedUser"
}
