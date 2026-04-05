using MediatR;

namespace Epiknovel.Shared.Core.Events;

/// <summary>
/// Bir veri silindiğinde veya arşive alındığında tetiklenir.
/// Verinin aslı (JSON) bu event ile taşınır ve asenkron olarak saklanır.
/// </summary>
public record DataArchivedEvent(
    string EntityType,
    Guid EntityId,
    string DataJson,
    Guid PerformedByUserId,
    DateTime ArchivedAt) : INotification;
