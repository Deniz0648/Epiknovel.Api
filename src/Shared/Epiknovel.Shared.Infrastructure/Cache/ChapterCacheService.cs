using System.Collections.Concurrent;
using MessagePack;
using StackExchange.Redis;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Shared.Infrastructure.Cache;

public interface IChapterCacheService
{
    Task SetChapterAsync<T>(string slug, T data, TimeSpan? expiry = null);
    Task<T?> GetChapterAsync<T>(string slug);
    Task<T?> GetOrAddAsync<T>(string slug, Func<Task<T?>> factory, Func<T, bool> shouldCache, TimeSpan? expiry = null);
    Task RemoveChapterAsync(string slug);
}

public class ChapterCacheService(
    IConnectionMultiplexer redis,
    ILogger<ChapterCacheService> logger) : IChapterCacheService
{
    private readonly IDatabase _db = redis.GetDatabase();
    private const string CachePrefix = "chapter:content:";
    
    // Per-Slug Lock yönetimi (Cache Stampede Koruması - Local)
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public async Task SetChapterAsync<T>(string slug, T data, TimeSpan? expiry = null)
    {
        try
        {
            var key = CachePrefix + slug;
            byte[] bytes = MessagePackSerializer.Serialize(data, MessagePackSerializerOptions.Standard.WithResolver(MessagePack.Resolvers.StandardResolver.Instance));
            await _db.StringSetAsync(key, bytes, expiry ?? TimeSpan.FromHours(24));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Chapter Cache yazma hatası: {Slug}", slug);
        }
    }

    public async Task<T?> GetChapterAsync<T>(string slug)
    {
        try
        {
            var key = CachePrefix + slug;
            var bytes = await _db.StringGetAsync(key);

            if (bytes.IsNull) return default;

            return MessagePackSerializer.Deserialize<T>(bytes!, MessagePackSerializerOptions.Standard.WithResolver(MessagePack.Resolvers.StandardResolver.Instance));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Chapter Cache okuma hatası (Bozuk veri olabilir): {Slug}", slug);
            return default;
        }
    }

    public async Task<T?> GetOrAddAsync<T>(string slug, Func<Task<T?>> factory, Func<T, bool> shouldCache, TimeSpan? expiry = null)
    {
        // 1. Önce Kilitsiz Oku (Hızlı Yol - Cache Hit)
        var cached = await GetChapterAsync<T>(slug);
        if (cached != null) return cached;

        // 2. Kilit Al (Slug bazlı) - Cache Stampede Koruması
        // Thundering Herd oluşmasını engeller; 1000 kişi aynı anda gelirse sadece 1'i factory'e gider.
        var myLock = _locks.GetOrAdd(slug, _ => new SemaphoreSlim(1, 1));
        await myLock.WaitAsync();

        try
        {
            // 3. Kilit içindeyken Tekrar Kontrol Et (Double-Check Locking)
            cached = await GetChapterAsync<T>(slug);
            if (cached != null) return cached;

            // 4. Factory'i (DB Sorgusu) çalıştır
            var data = await factory();
            
            // 5. Sadece "Gerekliyse" (örn: Status == Published) cache'le
            if (data != null && shouldCache(data))
            {
                await SetChapterAsync(slug, data, expiry);
            }

            return data;
        }
        finally
        {
            myLock.Release();
            
            // Eğer lock bekleyen başka kimse yoksa temizle (Memory Leak önleme)
            if (myLock.CurrentCount > 0)
            {
                _locks.TryRemove(slug, out _);
            }
        }
    }

    public async Task RemoveChapterAsync(string slug)
    {
        await _db.KeyDeleteAsync(CachePrefix + slug);
    }
}
