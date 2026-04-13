using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Management.Domain;

public class AuthorApplication : BaseEntity, ISoftDelete, IOwnable
{
    // UserId (Başvuran kişi) ile eşleşir
    public Guid UserId { get; set; }

    public string SampleContent { get; set; } = string.Empty;
    public string Experience { get; set; } = string.Empty;
    public string PlannedWork { get; set; } = string.Empty;

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    public string? RejectionReason { get; set; }
    
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }

    public override void UndoDelete()
    {
        base.UndoDelete();
    }
}
