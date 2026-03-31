using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.AspNetCore.OutputCaching;

namespace Epiknovel.Modules.Management.Endpoints.System.PurgeCache;

public record PurgeCacheRequest { public string Tag { get; init; } = string.Empty; }

[AuditLog("Output Cache Purged")]
public class PurgeCacheEndpoint(IOutputCacheStore cacheStore) : Endpoint<PurgeCacheRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/system/purge-cache");
        Roles(RoleNames.SuperAdmin, RoleNames.Admin);
        Summary(s =>
        {
            s.Summary = "Invalidate Output Cache by Tag";
            s.Description = "Clears all cached pages/objects associated with the provided tag (e.g. 'book-123'). High performance cleanup.";
        });
    }

    public override async Task HandleAsync(PurgeCacheRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Tag))
        {
            await Send.ResponseAsync(Result<string>.Failure("Cache tag is required."), 400, ct);
            return;
        }

        await cacheStore.EvictByTagAsync(req.Tag, ct);

        await Send.ResponseAsync(Result<string>.Success($"Cache with tag '{req.Tag}' has been invalidated."), 200, ct);
    }
}
