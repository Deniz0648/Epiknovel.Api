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
using Microsoft.Extensions.DependencyInjection;
using Epiknovel.Shared.Core.Interfaces.Wallet;

namespace Epiknovel.Modules.Books.Endpoints.GetChapter;

public class Endpoint(
    BooksDbContext dbContext, 
    StackExchange.Redis.IConnectionMultiplexer redis,
    IReadingProgressProvider progressProvider,
    IUserAccountProvider userAccountProvider,
    IPermissionService permissionService,
    IServiceScopeFactory scopeFactory,
    IWalletProvider walletProvider,
    Epiknovel.Shared.Infrastructure.Cache.IChapterCacheService chapterCache) : Endpoint<Request, Result<Response>>
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
        // 0. Kimlik ve Ortam Hazırlığı
        var userIdStrRaw = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        Guid currentUserId = Guid.Empty;
        bool isAuthenticated = !string.IsNullOrEmpty(userIdStrRaw) && Guid.TryParse(userIdStrRaw, out currentUserId);
        
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        bool isConfirmed = false;
        if (isAuthenticated)
        {
            isConfirmed = env == "Development" || await userAccountProvider.IsEmailConfirmedAsync(currentUserId, ct);
        }

        // 1. Cache Stampede Korumalı Data Alımı (Technical Decision 1 & 4)
        // Eğer bölüm Published ise cache'den gelir, yoksa DB'den çekilip cache'lenir.
        // Taslaklar (Draft) DB'den çekilir ama cache'lenmez (shouldCache predicate).
        var response = await chapterCache.GetOrAddAsync(
            req.Slug,
            async () => await FetchChapterFromDbAsync(req.Slug, ct),
            res => res.Status == ChapterStatus.Published);

        if (response == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // 2. Yetki ve Taslak Gizliliği Kontrolü (Personalized)
        bool canModerate = await permissionService.HasPermissionAsync(User, PermissionNames.ModerateContent, ct);
        bool isBookOwnerOrCollaborator = false;

        if (isAuthenticated)
        {
            // Kitabın ana sahibi veya yetki verilmiş ortak yazarlarından biri mi?
            isBookOwnerOrCollaborator = await dbContext.BookMembers
                .AnyAsync(x => x.BookId == response.BookId && x.UserId == currentUserId, ct);
        }

        // Taslak (Draft/Scheduled) Kontrolü
        if (response.Status != ChapterStatus.Published)
        {
            // Sadece yönetici veya kitabın ekibi taslakları görebilir
            if (!isBookOwnerOrCollaborator && !canModerate)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Bu bölüm henüz yayınlanmamış."), 403, ct);
                return;
            }
        }

        // 3. Kullanıcıya Özel Overlays (Personalized - Bu kısımlar cache'lenmez)
        // İçerik erişim yetkisi var mı? (Ücretsiz mi, Ekip mi, Yönetici mi?)
        bool hasFullAccess = response.IsFree || isBookOwnerOrCollaborator || canModerate;

        if (isAuthenticated)
        {
            // Okuma ilerlemesi
            response.LastReadScrollPercentage = await progressProvider.GetProgressPercentageAsync(currentUserId, response.BookId, response.Id, ct);
            
            // Eğer hala yetki yoksa (Ücretli bölüm ise) cüzdan kontrolü yap (Satın alınmış mı?)
            if (!hasFullAccess)
            {
                hasFullAccess = await walletProvider.HasUserUnlockedChapterAsync(currentUserId, response.Id, ct);
            }

            // Kısıtlama Koşulları: E-posta onaylanmamışsa (Order > 1) VEYA Ücretli olup satın alınmamışsa
            bool restrictedByEmail = !isConfirmed && response.Order > 1;
            bool restrictedByPayment = !hasFullAccess && !response.IsFree;

            if (restrictedByEmail || restrictedByPayment)
            {
                int takeCount = (int)Math.Ceiling(response.Paragraphs.Count * 0.15);
                if (takeCount < 1 && response.Paragraphs.Count > 0) takeCount = 1;
                response.Paragraphs = response.Paragraphs.Take(takeCount).ToList();
                response.IsPreview = true;
                response.PreviewMessage = restrictedByPayment 
                    ? "Bu bölüm ücretlidir. Tamamını okumak için lütfen satın alın."
                    : "Bu bölümün sadece %15'lik kısmını görmektesiniz. Tamamını okumak için lütfen hesabınızı onaylayın.";
            }
        }
        else
        {
            // Giriş yapmamış kullanıcı tüm bölümleri (ücretsiz olsa dahi) sadece preview olarak görebilir
            int takeCount = (int)Math.Ceiling(response.Paragraphs.Count * 0.15);
            if (takeCount < 1 && response.Paragraphs.Count > 0) takeCount = 1;
            response.Paragraphs = response.Paragraphs.Take(takeCount).ToList();
            response.IsPreview = true;
            
            response.PreviewMessage = response.IsFree 
                ? "Bu bölüm ücretsizdir ancak okumak için lütfen giriş yapın."
                : "Bu bölüm ücretlidir. Okumak için lütfen giriş yapın ve satın alın.";
        }

        // 4. Arka Plan İşlemleri (Hit sayacı vb.)
        ProcessBackgroundTasks(response.Id, response.BookId, currentUserId, isAuthenticated);

        // 🚀 ANLIK GÖRSEL İYİLEŞTİRME (Technical Decision 4)
        // SQL'den gelen değere Redis'te birikmiş ama henüz SQL'e yazılmamış (5 dk'lık buffer) hitleri ekle.
        // Böylece kullanıcı yenilediğinde sayacı artmış görür.
        try 
        {
            var db = redis.GetDatabase();
            var pendingHits = await db.StringGetAsync($"chapter:hits:{response.Id}");
            if (pendingHits.HasValue)
            {
                response.ViewCount += (long)pendingHits;
            }
        } catch { }

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }

    private async Task<Response?> FetchChapterFromDbAsync(string slug, CancellationToken ct)
    {
        // DB ve Navigasyon işlemleri bu factory içinde Thundering Herd korumalı çalışır
        var chapter = await dbContext.Chapters
            .Where(x => x.Slug == slug && !x.Book.IsHidden)
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
                BookTitle = c.Book.Title,
                BookSlug = c.Book.Slug,
                TotalChapters = dbContext.Chapters.Count(x => x.BookId == c.BookId && x.Status == ChapterStatus.Published),
                c.PublishedAt,
                c.ScheduledPublishDate,
                c.ViewCount,
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

        if (chapter == null) return null;

        var res = new Response
        {
            Id = chapter.Id,
            AuthorUserId = chapter.UserId, // BOLA kontrolü için DTO'ya eklenmeli
            Title = chapter.Title,
            WordCount = chapter.WordCount,
            Order = chapter.Order,
            IsFree = chapter.IsFree,
            Price = chapter.Price,
            Status = chapter.Status,
            IsTitleSpoiler = chapter.IsTitleSpoiler,
            BookTitle = chapter.BookTitle,
            BookSlug = chapter.BookSlug,
            BookId = chapter.BookId,
            TotalChapters = chapter.TotalChapters,
            PublishedAt = chapter.PublishedAt ?? DateTime.UtcNow,
            ScheduledPublishDate = chapter.ScheduledPublishDate.HasValue 
                ? DateTime.SpecifyKind(chapter.ScheduledPublishDate.Value, DateTimeKind.Utc) 
                : null,
            ViewCount = chapter.ViewCount,
            Paragraphs = chapter.Paragraphs,
            IsTruncated = chapter.ParagraphCount > MaxParagraphsPerResponse,
            TruncationMessage = chapter.ParagraphCount > MaxParagraphsPerResponse
                ? $"Bu bölüm çok büyük olduğu için ilk {MaxParagraphsPerResponse} satır gösteriliyor."
                : null
        };

        // Navigasyon Bilgileri
        var baseNavQuery = dbContext.Chapters
            .AsNoTracking()
            .Where(x => x.BookId == chapter.BookId && x.Status == ChapterStatus.Published);

        res.PreviousChapterSlug = await baseNavQuery
            .Where(x => x.Order < chapter.Order)
            .OrderByDescending(x => x.Order)
            .Select(x => x.Slug)
            .FirstOrDefaultAsync(ct);

        res.NextChapterSlug = await baseNavQuery
            .Where(x => x.Order > chapter.Order)
            .OrderBy(x => x.Order)
            .Select(x => x.Slug)
            .FirstOrDefaultAsync(ct);

        return res;
    }

    private void ProcessBackgroundTasks(Guid chapterId, Guid bookId, Guid userId, bool isAuthenticated)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "anon";

        // Arka planda güvenli çalışma (Scope dışı bağımlılıkları yönetmek için)
        _ = Task.Run(async () => {
            try 
            {
                using var scope = scopeFactory.CreateScope();
                var internalMediator = scope.ServiceProvider.GetRequiredService<IMediator>();
                
                var db = redis.GetDatabase();
                var chapterIdStr = chapterId.ToString();
                var identifier = isAuthenticated ? userId.ToString() : remoteIp;
                
                var uniqueHitKey = $"chapter:hits:unique:{chapterIdStr}";
                
                if (await db.SetAddAsync(uniqueHitKey, identifier))
                {
                    await db.StringIncrementAsync($"chapter:hits:{chapterIdStr}");
                    await db.SetAddAsync("chapters:dirty", chapterIdStr);
                    
                    // 📚 Kitap istatistiklerini de artır
                    if (bookId != Guid.Empty)
                    {
                        var bookIdStr = bookId.ToString();
                        await db.StringIncrementAsync($"book:hits:{bookIdStr}");
                        await db.SetAddAsync("books:dirty", bookIdStr);
                    }
                    
                    if (isAuthenticated)
                    {
                        await internalMediator.Publish(new Epiknovel.Shared.Core.Events.ChapterReadEvent(
                            bookId,
                            chapterId,
                            userId,
                            0,
                            DateTime.UtcNow));
                    }
                }
            }
            catch (Exception ex)
            {
                // Sessiz hata ama loglanabilir
                System.Diagnostics.Debug.WriteLine($"Stats Error: {ex.Message}");
            }
        });
    }
}


