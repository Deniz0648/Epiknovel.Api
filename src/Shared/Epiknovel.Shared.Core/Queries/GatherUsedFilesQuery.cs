using MediatR;

namespace Epiknovel.Shared.Core.Queries;

/// <summary>
/// Tüm modüllere "Hangi dosyaları kullanıyorsunuz?" sorusunu soran sorgu.
/// Sahipsiz dosya temizliği (Orphan Cleanup) için kullanılır.
/// </summary>
public record GatherUsedFilesQuery() : IRequest<IEnumerable<string>>;
