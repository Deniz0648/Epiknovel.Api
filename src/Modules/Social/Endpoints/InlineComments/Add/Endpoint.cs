using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Distributed;

namespace Epiknovel.Modules.Social.Endpoints.InlineComments.Add;

public record Request
{
    public Guid ChapterId { get; init; }
    public Guid ParagraphId { get; init; } // Metin içindeki spesifik paragraf/satır ID'si
    public string Content { get; init; } = string.Empty;
}

public class Endpoint(
    SocialDbContext dbContext, 
    Epiknovel.Shared.Core.Interfaces.Books.IBookProvider bookProvider,
    IDistributedCache cache) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/social/inline-comments");
        Summary(s => {
            s.Summary = "Paragraf bazlı (inline) yorum ekle.";
            s.Description = "Bölüm içindeki spesifik bir paragrafa/satıra yorum yapılmasını sağlar. Paragraf ve Bölüm doğrulaması yapılır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Kullanıcı Kontrolü
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // 2. Spam Kalkanı (Rate Limiting) - Redis tabanlı (3 Yorum / 1 Dakika)
        var limitKey = $"rl:social:inline:{userId}:{req.ChapterId}";
        var countStr = await cache.GetStringAsync(limitKey, ct);
        if (int.TryParse(countStr, out var count) && count >= 3)
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Çok sık yorum yapıyorsunuz. Lütfen biraz bekleyin."), 429, ct);
            return;
        }

        // 3. Paragraf ve Bölüm Doğrulaması (BOLA & Integrity)
        var isChapterActive = await bookProvider.IsChapterActiveAsync(req.ChapterId, ct);
        if (!isChapterActive)
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Bölüm bulunamadı veya silinmiş."), 404, ct);
            return;
        }

        var isParagraphValid = await bookProvider.IsParagraphInChapterAsync(req.ParagraphId, req.ChapterId, ct);
        if (!isParagraphValid)
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Belirtilen paragraf bu bölüme ait değil."), 403, ct);
            return;
        }

        // 4. Yorum Ekle
        var comment = new InlineComment
        {
            UserId = userId,
            ChapterId = req.ChapterId,
            ParagraphId = req.ParagraphId,
            Content = req.Content,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.InlineComments.Add(comment);
        await dbContext.SaveChangesAsync(ct);

        // 5. Rate Limit Güncelle
        await cache.SetStringAsync(limitKey, (count + 1).ToString(), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1)
        }, ct);

        await Send.ResponseAsync(Result<Guid>.Success(comment.Id), 200, ct);
    }
}
