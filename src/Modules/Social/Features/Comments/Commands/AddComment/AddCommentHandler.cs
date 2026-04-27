using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Social.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces.Books;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Ganss.Xss;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;

namespace Epiknovel.Modules.Social.Features.Comments.Commands.AddComment;

public class AddCommentHandler(
    SocialDbContext dbContext,
    IMediator mediator,
    IBookProvider bookProvider,
    IUserProvider userProvider,
    IHttpContextAccessor httpContextAccessor,
    IDistributedCache cache) : IRequestHandler<AddCommentCommand, Result<Guid>>
{
    private static readonly string[] BadWords = ["küfür1", "argo1", "hakaret1"]; // Basit liste
    public async Task<Result<Guid>> Handle(AddCommentCommand request, CancellationToken ct)
    {
        try
        {
            if (request.BookId == null && request.ChapterId == null)
            {
                return Result<Guid>.Failure("Yorumun yapılacağı kitap veya bölüm belirtilmelidir.");
            }

            // 🛡️ 1. IP-based Hourly Quota
            var ip = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var hourlyKey = $"rate_limit:comments:ip:{ip}:{DateTime.UtcNow:yyyyMMddHH}";
            var countStr = await cache.GetStringAsync(hourlyKey, ct);
            var count = string.IsNullOrEmpty(countStr) ? 0 : int.Parse(countStr);

            if (count >= 50)
            {
                return Result<Guid>.Failure("Saatlik yorum limitinize ulaştınız. Lütfen bir sonraki saati bekleyin.");
            }

            // 🛡️ 2. User-based Cooldown (30s)
            var lastCommentDate = await dbContext.Comments
                .Where(c => c.UserId == request.UserId)
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => c.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (lastCommentDate != default && (DateTime.UtcNow - lastCommentDate).TotalSeconds < 30)
            {
                return Result<Guid>.Failure("Çok hızlı yorum yapıyorsunuz. Lütfen biraz bekleyin.");
            }

            // 🛡️ 3. Advanced Spam Filtering
            var contentHash = ComputeHash(request.Content);
            var recentComments = await dbContext.Comments
                .Where(c => c.UserId == request.UserId)
                .OrderByDescending(c => c.CreatedAt)
                .Take(3)
                .Select(c => c.Content)
                .ToListAsync(ct);

            foreach (var recent in recentComments)
            {
                if (TextHelper.CalculateSimilarity(request.Content, recent) > 0.80)
                {
                    return Result<Guid>.Failure("Benzer yorumu zaten yakın zamanda yaptınız. Lütfen farklı bir içerik paylaşın.");
                }
            }

            // 🛡️ 4. Bad Word Filtering
            if (BadWords.Any(w => request.Content.Contains(w, StringComparison.OrdinalIgnoreCase)))
            {
                return Result<Guid>.Failure("Yorumunuz uygunsuz ifadeler içeriyor.");
            }

            // 🔍 5. Aktiflik Kontrolleri
            if (request.BookId.HasValue && !await bookProvider.IsBookActiveAsync(request.BookId.Value, ct))
            {
                return Result<Guid>.Failure("Kitap bulunamadı veya silinmiş.");
            }

            Comment? parentComment = null;
            if (request.ParentCommentId.HasValue)
            {
                parentComment = await dbContext.Comments.FirstOrDefaultAsync(c => c.Id == request.ParentCommentId.Value, ct);
                if (parentComment == null)
                {
                    return Result<Guid>.Failure("Yanıtlanacak yorum bulunamadı.");
                }

                // 🛡️ Derinlik Kontrolü & Düzleştirme (Flattening)
                // Eğer yanıtlanan yorum zaten bir yanıtsa, yeni yorumu kök (root) yoruma bağla.
                // Böylece 3. katman oluşmaz, tüm yanıtlar 2. katmanda toplanır.
                if (parentComment.ParentCommentId.HasValue)
                {
                    var rootParentId = parentComment.ParentCommentId.Value;
                    parentComment = await dbContext.Comments.FirstOrDefaultAsync(c => c.Id == rootParentId, ct);
                    
                    // Request nesnesini değiştiremeyiz (record), bu yüzden aşağıda atama yaparken dikkat edeceğiz.
                    // rootParentId değişkenini kullanacağız.
                }
            }

            // 🧹 6. XSS Koruması & Instagram Stil Etiketleme
            var sanitizer = new HtmlSanitizer();
            // Tiptap Mention niteliklerine ve span etiketine izin ver
            sanitizer.AllowedTags.Add("span");
            sanitizer.AllowedAttributes.Add("data-type");
            sanitizer.AllowedAttributes.Add("data-id");
            sanitizer.AllowedClasses.Add("text-primary");
            sanitizer.AllowedClasses.Add("font-bold");
            sanitizer.AllowedClasses.Add("decoration-primary/30");
            sanitizer.AllowedClasses.Add("underline");
            sanitizer.AllowedClasses.Add("decoration-2");
            sanitizer.AllowedClasses.Add("underline-offset-4");

            var finalContent = request.Content;

            if (request.ParentCommentId.HasValue)
            {
                var targetComment = await dbContext.Comments.FirstOrDefaultAsync(c => c.Id == request.ParentCommentId.Value, ct);
                if (targetComment != null)
                {
                    // Eğer hedef yorum bir yanıtsa (3. katman engelleme), etiket ekle
                    if (targetComment.ParentCommentId.HasValue)
                    {
                        var targetSlugs = await userProvider.GetSlugsByUserIdsAsync([targetComment.UserId], ct);
                        if (targetSlugs.TryGetValue(targetComment.UserId, out var slug))
                        {
                            var mentionHtml = $"<span data-type=\"mention\" class=\"text-primary font-bold decoration-primary/30 underline decoration-2 underline-offset-4\" data-id=\"{slug}\">@{slug}</span> ";
                            
                            // Kullanıcı zaten bu kişiyi etiketlemiş mi? (HTML içindeki data-id kontrolü en güvenlisidir)
                            bool alreadyHasMention = finalContent.Contains($"data-id=\"{slug}\"") || 
                                                     finalContent.Contains($"@{slug}");

                            if (!alreadyHasMention)
                            {
                                // Eğer içerik <p> ile başlıyorsa, etiketi içeriye (paragrafın başına) enjekte et
                                if (finalContent.Trim().StartsWith("<p>"))
                                {
                                    finalContent = finalContent.Replace("<p>", $"<p>{mentionHtml}");
                                }
                                else
                                {
                                    finalContent = mentionHtml + finalContent;
                                }
                            }
                        }
                    }
                }
            }

            var sanitizedContent = sanitizer.Sanitize(finalContent);

            // 🏷️ 7. Mention Parsing
            var mentions = await ParseMentionsAsync(sanitizedContent, ct);

            // ✍️ 8. Yorum Kaydı
            var isAuthor = false;
            if (request.BookId.HasValue)
            {
                var authorId = await bookProvider.GetBookOwnerIdAsync(request.BookId.Value, ct);
                isAuthor = authorId == request.UserId;
            }

            var comment = new Comment
            {
                UserId = request.UserId,
                BookId = request.BookId,
                ChapterId = request.ChapterId,
                ParagraphId = request.ParagraphId, // ✨ Satır yorumu desteği
                ParentCommentId = parentComment?.Id,
                Content = sanitizedContent,
                ContentHash = contentHash,
                IsSpoiler = request.IsSpoiler,
                IsAuthorComment = isAuthor,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.Comments.Add(comment);

            // 🚀 9. Atomic Counter Update
            if (parentComment != null)
            {
                parentComment.ReplyCount++; 
            }

            // Mentions Kaydı
            foreach (var mentionUserId in mentions)
            {
                dbContext.CommentMentions.Add(new CommentMention
                {
                    Comment = comment,
                    MentionedUserId = mentionUserId
                });
            }

            await dbContext.SaveChangesAsync(ct);

            // IP Kotasını Artır
            await cache.SetStringAsync(hourlyKey, (count + 1).ToString(), new DistributedCacheEntryOptions {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            }, ct);

            // 📢 10. Event Publishing
            await mediator.Publish(new CommentCreatedEvent(
                comment.Id,
                comment.UserId,
                comment.BookId,
                comment.ChapterId,
                comment.Content,
                comment.CreatedAt), ct);

            return Result<Guid>.Success(comment.Id);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] AddCommentHandler: {ex.Message}");
            if (ex.InnerException != null) Console.WriteLine($"[INNER] {ex.InnerException.Message}");
            return Result<Guid>.Failure("Yorum kaydedilirken sunucu hatası oluştu.");
        }
    }

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
    }

    private async Task<List<Guid>> ParseMentionsAsync(string content, CancellationToken ct)
    {
        var mentions = new List<Guid>();
        var regex = new Regex(@"@([\w-]+)", RegexOptions.Compiled);
        var matches = regex.Matches(content);

        foreach (Match match in matches)
        {
            var slug = match.Groups[1].Value;
            var userId = await userProvider.GetUserIdBySlugAsync(slug, ct);
            if (userId.HasValue && !mentions.Contains(userId.Value))
            {
                mentions.Add(userId.Value);
            }
        }

        return mentions;
    }
}
