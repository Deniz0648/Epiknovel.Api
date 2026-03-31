namespace Epiknovel.Shared.Core.Interfaces;

public interface IReadingProgressProvider
{
    Task<double?> GetProgressPercentageAsync(Guid userId, Guid bookId, Guid chapterId, CancellationToken ct = default);
}
