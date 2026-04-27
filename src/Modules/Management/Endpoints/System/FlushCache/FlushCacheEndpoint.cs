using FastEndpoints;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using Microsoft.AspNetCore.OutputCaching;
using StackExchange.Redis;
using Epiknovel.Shared.Infrastructure.Security;

namespace Epiknovel.Modules.Management.Endpoints.System.FlushCache;

public class FlushCacheEndpoint(
    IConnectionMultiplexer redis,
    IOutputCacheStore cacheStore) : EndpointWithoutRequest<Result<string>>
{
    public override void Configure()
    {
        Post("/management/system/flush-cache");
        Policies(PolicyNames.SuperAdminOnly);
        Summary(s => {
            s.Summary = "Tüm Sistem Önbelleğini Temizle";
            s.Description = "Hem Redis veri tabanını (FlushAll) hem de Output Cache üzerindeki tüm verileri temizler. Kritik bir işlemdir.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            // 1. Redis'i Temizle (FlushAllDatabases)
            var endpoints = redis.GetEndPoints();
            foreach (var endpoint in endpoints)
            {
                var server = redis.GetServer(endpoint);
                if (server is { IsConnected: true, IsReplica: false })
                {
                    await server.FlushAllDatabasesAsync();
                }
            }

            // 2. Output Cache'i Temizle
            // Tüm bilinen ana etiketleri temizle
            await cacheStore.EvictByTagAsync(CacheTags.Global, ct);
            await cacheStore.EvictByTagAsync(CacheTags.AllBooks, ct);
            await cacheStore.EvictByTagAsync(CacheTags.AllCategories, ct);
            await cacheStore.EvictByTagAsync(CacheTags.AllTags, ct);

            await Send.ResponseAsync(Result<string>.Success("Sistem önbelleği başarıyla sıfırlandı."), 200, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Önbellek temizlenirken hata oluştu: {ex.Message}"), 500, ct);
        }
    }
}
