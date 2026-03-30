using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Domain;

public class UserProfile : BaseEntity, ISoftDelete, IOwnable
{
    // Identity modülündeki UserId ile birebir eşleşir (Foreign Key değil, Logical Link).
    public Guid UserId { get => Id; set => Id = value; }

    public string DisplayName { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }

    // Ödül ve Etkileşim Verileri
    public DateTime? LastLoginAt { get; set; }
    public DateTime? LastRewardClaimedAt { get; set; }

    // Denormalize (Cache) Sosyal Veriler
    public int TotalFollowers { get; set; }
    public int TotalFollowing { get; set; }

    // Finansal Yetkiler
    public bool IsAuthor { get; set; }
    public bool IsPaidAuthor { get; set; }
    public string? VerifiedIban { get; set; }

    // ISoftDelete Implementation (BaseEntity.IsDeleted kullanılıyor)
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }

    public void UndoDelete()
    {
        IsDeleted = false;
        DeletedAt = null;
        DeletedByUserId = null;
    }
}
