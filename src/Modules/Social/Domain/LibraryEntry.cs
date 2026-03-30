using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public enum ReadingStatus
{
    Reading,
    Completed,
    Dropped,
    PlanToRead
}

public class LibraryEntry : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Books modülündeki BookId ile eşleşir
    public Guid BookId { get; set; }

    // UserId ile eşleşir
    public Guid UserId { get; set; }

    public ReadingStatus Status { get; set; } = ReadingStatus.PlanToRead;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastReadAt { get; set; }
}
