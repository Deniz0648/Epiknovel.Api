using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Epiknovel.Shared.Core.Interfaces;

/// <summary>
/// Sosyal modüldeki kütüphane ve abone bilgilerini diğer modüllere (özellikle bildirimlere) sunar.
/// </summary>
public interface ILibraryProvider
{
    /// <summary>
    /// Belirli bir kitabı kütüphanesine eklemiş olan (abone) kullanıcıların listesini döner.
    /// </summary>
    Task<List<Guid>> GetSubscribersAsync(Guid bookId, CancellationToken ct = default);
}
