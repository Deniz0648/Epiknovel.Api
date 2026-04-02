using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Caching.Distributed;
using MediatR;
using System.Security.Claims;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Endpoints.GetChapter;

public class Endpoint(
    BooksDbContext dbContext, 
    StackExchange.Redis.IConnectionMultiplexer redis,
    IMediator mediator,
    IReadingProgressProvider progressProvider,
    IUserAccountProvider userAccountProvider,
    IPermissionService permissionService) : Endpoint<Request, Result<Response>>
{
    private const int MaxParagraphsPerResponse = 2000;

    public override void Configure()
    {
        Get("/books/chapters/{Slug}");
        AllowAnonymous();
        Options(x => x.WithMetadata(new Microsoft.AspNetCore.OutputCaching.OutputCacheAttribute { Duration = 60, Tags = new[] { "ChapterCache" } }));
        Summary(s => {
            s.Summary = "Bir kitabın bölüm içeriğini getirir.";
            s.Description = "İçeriği satır bazlı döner. İzlenme sayıları ve okuma geçmişi arka planda güncellenir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Bölümü ve sıralı paragrafları doğrudan Projeksiyon (Select) ile getir
        // AsNoTracking()'ten daha hızlıdır ve RAM şişmesini (LOH) engeller
        var chapter = await dbContext.Chapters
            .Where(x => x.Slug == req.Slug)
            .Select(c => new 
            {
                c.Id,
                c.BookId,
                c.UserId,
                c.Title,
                c.Slug,
                c.WordCount,
                c.Order,
                c.Status,
                c.IsFree,
                c.Price,
                c.IsTitleSpoiler,
                c.PublishedAt,
                ParagraphCount = c.Paragraphs.Count(),
                Paragraphs = c.Paragraphs.OrderBy(p => p.Order).Select(p => new ParagraphDto
                {
                    Id = p.Id,
                    Content = p.Content,
                    Type = p.Type.ToString(),
                    Order = p.Order
                }).Take(MaxParagraphsPerResponse).ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (chapter == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // 1.1 Taslak Gizliliği Kontrolü
        var userIdStrRaw = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        bool isAuthorizedToSeeDraft = false;
        if (!string.IsNullOrEmpty(userIdStrRaw) && Guid.TryParse(userIdStrRaw, out var currentUserId))
        {
            var canModerateContent = await permissionService.HasPermissionAsync(User, PermissionNames.ModerateContent, ct);
            if (chapter.UserId == currentUserId || canModerateContent)
            {
                isAuthorizedToSeeDraft = true;
            }
        }

        if (chapter.Status != ChapterStatus.Published && !isAuthorizedToSeeDraft)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bu bölüm henüz yayınlanmamış."), 403, ct);
            return;
        }

        // 2. Yetki ve Onay Kontrolü (%15 Kısıtlaması)
        bool isConfirmed = false;
        if (!string.IsNullOrEmpty(userIdStrRaw) && Guid.TryParse(userIdStrRaw, out var userId))
        {
            isConfirmed = await userAccountProvider.IsEmailConfirmedAsync(userId, ct);
        }

        // 3. Response hazırla
        var response = new Response
        {
            Id = chapter.Id,
            Title = chapter.Title,
            WordCount = chapter.WordCount,
            Order = chapter.Order,
            IsFree = chapter.IsFree,
            Price = chapter.Price,
            Status = chapter.Status,
            IsTitleSpoiler = chapter.IsTitleSpoiler,
            PublishedAt = chapter.PublishedAt ?? DateTime.UtcNow,
            Paragraphs = chapter.Paragraphs.Select(p => new ParagraphDto
            {
                Id = p.Id,
                Content = p.Content,
                Type = p.Type.ToString(),
                Order = p.Order
            }).ToList(),
            IsTruncated = chapter.ParagraphCount > MaxParagraphsPerResponse,
            TruncationMessage = chapter.ParagraphCount > MaxParagraphsPerResponse
                ? $"Bu bölüm çok büyük olduğu için ilk {MaxParagraphsPerResponse} satır gösteriliyor."
                : null
        };

        // --- OKUYUCU İSTEĞİ: Kısıtlama Uygula ---
        if (!isConfirmed)
        {
            if (chapter.Order > 1)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Sadece ilk bölümün bir kısmını önizleyebilirsiniz. Devamı için e-postanızı onaylayın."), 403, ct);
                return;
            }
            else
            {
                int takeCount = (int)Math.Ceiling(chapter.Paragraphs.Count * 0.15);
                if (takeCount < 1 && chapter.Paragraphs.Count > 0) takeCount = 1;
                
                response.Paragraphs = response.Paragraphs.Take(takeCount).ToList();
                response.IsPreview = true;
                response.PreviewMessage = "Bu bölümün sadece %15'lik kısmını görmektesiniz. Tamamını okumak için lütfen hesabınızı onaylayın.";
            }
        }

        // 4. Navigasyon Bilgilerini Getir (Sonraki/Önceki Bölüm)
        var baseNavQuery = dbContext.Chapters
            .AsNoTracking()
            .Where(x => x.BookId == chapter.BookId && x.Status == ChapterStatus.Published);

        response.PreviousChapterSlug = await baseNavQuery
            .Where(x => x.Order < chapter.Order)
            .OrderByDescending(x => x.Order)
            .Select(x => x.Slug)
            .FirstOrDefaultAsync(ct);

        response.NextChapterSlug = await baseNavQuery
            .Where(x => x.Order > chapter.Order)
            .OrderBy(x => x.Order)
            .Select(x => x.Slug)
            .FirstOrDefaultAsync(ct);

        // 5. Okuma İlerlemesini Getir (Eğer kullanıcı giriş yapmışsa)
        if (!string.IsNullOrEmpty(userIdStrRaw) && Guid.TryParse(userIdStrRaw, out var userIdProgress))
        {
            response.LastReadScrollPercentage = await progressProvider.GetProgressPercentageAsync(userIdProgress, chapter.BookId, chapter.Id, ct);
        }

        // 6. Arka Plan İşlemleri: İzlenme Sayısı ve Okuma Geçmişi
        var chapterId = chapter.Id;
        var bookId = chapter.BookId;
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "anon";
        var userClaims = User.Claims.Select(c => new Claim(c.Type, c.Value)).ToList();

        _ = Task.Run(async () => {
            try 
            {
                var db = redis.GetDatabase();
                var chapterIdStr = chapterId.ToString();
                var userIdStr = userClaims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                var identifier = userIdStr ?? remoteIp;
                
                var today = DateTime.UtcNow.ToString("yyyyMMdd");
                var uniqueHitKey = $"chapter:hits:unique:{chapterIdStr}:{today}";
                
                if (await db.SetAddAsync(uniqueHitKey, identifier))
                {
                    await db.KeyExpireAsync(uniqueHitKey, TimeSpan.FromHours(24));
                    await db.StringIncrementAsync($"chapter:hits:{chapterIdStr}");
                    await db.SetAddAsync("chapters:dirty", chapterIdStr);
                }

                if (!string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var userIdParsed))
                {
                    await mediator.Publish(new Epiknovel.Shared.Core.Events.ChapterReadEvent(
                        bookId,
                        chapterId,
                        userIdParsed,
                        0,
                        DateTime.UtcNow));
                }
            }
            catch { }
        }, ct);

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}


