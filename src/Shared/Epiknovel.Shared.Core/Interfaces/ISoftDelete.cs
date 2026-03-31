namespace Epiknovel.Shared.Core.Interfaces;

public interface ISoftDelete
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
    Guid? DeletedByUserId { get; set; }
    string? ModerationNote { get; set; }
    void UndoDelete();
}
