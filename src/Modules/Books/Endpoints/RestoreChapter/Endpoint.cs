using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Microsoft.AspNetCore.OutputCaching;

namespace Epiknovel.Modules.Books.Endpoints.RestoreChapter;

public record Request 
{ 
    [BindFrom("Id")]
    public Guid Id { get; init; } 
}

[AuditLog("Bölüm Çöp Kutusundan Geri Yüklendi")]
public class Endpoint(
    BooksDbContext dbContext, 
    IOutputCacheStore cacheStore,
    Epiknovel.Shared.Infrastructure.Cache.IChapterCacheService chapterCache) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/books/chapters/{Id}/restore");
        Policies(PolicyNames.AuthorPanelAccess);
        Summary(s => {
            s.Summary = "Silinen bir bölümü çöp kutusundan geri getirir.";
            s.Description = "Bölümü geri yükler. Yazar kendi bölümünü, admin her bölümü geri yükleyebilir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        bool isAdmin = User.HasClaim(c => c.Type == ClaimTypes.Role && (c.Value == "Admin" || c.Value == "SuperAdmin"));

        var chapter = await dbContext.Chapters
            .IgnoreQueryFilters()
            .Include(c => c.Book)
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (chapter == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Bölüm bulunamadı."), 404, ct);
            return;
        }

        // Yetki Kontrolü
        if (!isAdmin && (!Guid.TryParse(userIdStr, out var userId) || chapter.Book.AuthorId != userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Bu işlem için yetkiniz yok."), 403, ct);
            return;
        }

        if (!chapter.IsDeleted)
        {
             await Send.ResponseAsync(Result<string>.Failure("Bölüm zaten aktif."), 400, ct);
             return;
        }

        // Bölümü geri yükle
        chapter.UndoDelete();

        await dbContext.SaveChangesAsync(ct);
        
        // Cache Invalidation
        await cacheStore.EvictByTagAsync("ChapterCache", ct);
        await chapterCache.RemoveChapterAsync(chapter.Slug);

        await Send.ResponseAsync(Result<string>.Success("Bölüm başarıyla geri yüklendi."), 200, ct);
    }
}
