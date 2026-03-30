using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Domain;

public class NotificationPreference : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }

    public bool EmailOnNewChapter { get; set; } = true;
    public bool EmailOnNewReview { get; set; } = true;
    public bool EmailOnNewComment { get; set; } = true;
    
    public bool PushOnNewChapter { get; set; } = true;
    public bool PushOnNewReview { get; set; } = true;
    public bool PushOnNewComment { get; set; } = true;

    public bool EmailMarketing { get; set; } = false;
}
