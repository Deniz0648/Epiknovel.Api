using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Social.Domain;

public class BookVote : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Books modülündeki BookId ile eşleşir
    public Guid BookId { get; set; }

    // Identity modülündeki UserId ile eşleşir
    public Guid UserId { get; set; }

    public int Value { get; set; } // Örn: 1-5 arası puan
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
