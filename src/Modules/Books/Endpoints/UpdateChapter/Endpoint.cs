using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.AspNetCore.OutputCaching;
using Epiknovel.Shared.Core.Constants;
using MediatR;
using Epiknovel.Shared.Core.Events;
using System.Threading;
using Epiknovel.Shared.Infrastructure.Security;

namespace Epiknovel.Modules.Books.Endpoints.UpdateChapter;

[AuditLog("Bölüm İçeriği Güncellendi (Sync Modu)")]
public class Endpoint(
    BooksDbContext dbContext, 
    IPermissionService permissionService, 
    IOutputCacheStore cacheStore, 
    Epiknovel.Shared.Core.Interfaces.Management.ISystemSettingProvider settings,
    Epiknovel.Shared.Infrastructure.Cache.IChapterCacheService chapterCache) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Patch("/books/chapters/{ChapterId}");
        Policies(Epiknovel.Shared.Core.Constants.PolicyNames.AuthorContentAccess);
        // Varsayılan olarak kimlik doğrulaması gerektirir
        Summary(s => {
            s.Summary = "Mevcut bir bölümü ve içeriğini (satır bazlı) günceller.";
            s.Description = "ID'si gönderilen satırlar güncellenir, eksik olanlar silinir. Yorumlar korunur.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Bölümü ve bağlı Kitabı getir (BOLA Zinciri Doğrulaması)
        var chapter = await dbContext.Chapters
            .Include(x => x.Paragraphs)
            .Include(x => x.Book) // Mülkiyet zinciri kontrolü için
            .FirstOrDefaultAsync(x => x.Id == req.ChapterId, ct);

        if (chapter == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // BOLA Hardening: İsteği atan kişi ana sahip mi, bölümü oluşturan mı yoksa ekip üyesi (Çevirmen/Editör) mi?
        bool isBookOwner = chapter.Book.AuthorId == req.UserId;
        bool isChapterCreator = chapter.UserId == req.UserId;
        bool isTeamMember = await dbContext.BookAuthors.AnyAsync(ba => ba.BookId == chapter.BookId && ba.UserId == req.UserId, ct);

        if (!isBookOwner && !isChapterCreator && !isTeamMember)
        {
            await Send.ForbiddenAsync(ct);
            return;
        }

        // 2. Ücretli Yazarlık Yetki Kontrolü
        if (!req.IsFree || req.Price > 0)
        {
             // 🚀 GLOBAL ECONOMY CHECK
            var economyEnabled = await settings.GetSettingValueAsync<string>("Economy_EnableWalletSystem", ct);
            if (economyEnabled == "false")
            {
                await Send.ResponseAsync(Result<Response>.Failure("Ücretli içerik sistemi şu anda kapalıdır."), 403, ct);
                return;
            }

            var canPublishPaidChapters = await permissionService.HasPermissionAsync(User, Epiknovel.Shared.Core.Constants.PermissionNames.PublishPaidChapters, ct);
            if (!canPublishPaidChapters)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Bölümü ücretli yapmak için önce başvurup onay almalısınız."), 403, ct);
                return;
            }
        }

        bool isFirstTimePublished = req.Status == ChapterStatus.Published && chapter.PublishedAt == null;

        // 2. Metadata güncelle
        int oldOrder = chapter.Order;
        int newOrder = req.Order;

        chapter.Title = req.Title;
        chapter.IsFree = req.IsFree;
        chapter.Price = req.Price;
        chapter.Status = req.Status;
        chapter.IsTitleSpoiler = req.IsTitleSpoiler;
        chapter.ScheduledPublishDate = req.Status == ChapterStatus.Scheduled && req.ScheduledPublishDate.HasValue 
            ? DateTime.SpecifyKind(req.ScheduledPublishDate.Value, DateTimeKind.Utc) 
            : null;
        
        if (isFirstTimePublished)
        {
            chapter.PublishedAt = DateTime.UtcNow;
        }

        chapter.UpdatedAt = DateTime.UtcNow;

        // 3. Satır Senkronizasyonu (Sync Logic + Sanitization)
        var existingParagraphs = chapter.Paragraphs.ToList();
        var incomingLines = req.Lines;

        var incomingIds = incomingLines.Select(l => l.Id).ToList();
        var toRemove = existingParagraphs.Where(p => !incomingIds.Contains(p.Id)).ToList();
        
        foreach (var p in toRemove) dbContext.Paragraphs.Remove(p);

        int currentOrder = 0;
        int totalWords = 0;

        foreach (var line in incomingLines)
        {
            currentOrder++;
            var sanitizedContent = SanitizerHelper.Sanitize(line.Content);

            var existing = existingParagraphs.FirstOrDefault(p => p.Id == line.Id);
            if (existing != null)
            {
                existing.Content = sanitizedContent;
                existing.Type = line.Type;
                existing.Order = currentOrder;
            }
            else
            {
                var newParagraph = new Paragraph
                {
                    UserId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString()),
                    Content = sanitizedContent,
                    Type = line.Type,
                    Order = currentOrder,
                    Id = line.Id == Guid.Empty ? Guid.NewGuid() : line.Id,
                    ChapterId = chapter.Id
                };
                dbContext.Paragraphs.Add(newParagraph);
            }

            if (line.Type == ParagraphType.Text)
            {
                totalWords += sanitizedContent.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
            }
        }

        chapter.WordCount = totalWords;

        // 🚀 TRANSACTIONAL INTEGRITY: Ensure Update & Event are atomic
        var strategy = dbContext.Database.CreateExecutionStrategy();
        var updateResult = await strategy.ExecuteAsync(async () => {
            using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
            try {
                // Bölüm sırası değişmişse diğerlerini kaydır
                if (oldOrder != newOrder)
                {
                    // ÇAKIŞMA ÖNLEME: Önce hedef bölümü geçici olarak negatif bir sıraya çek
                    await dbContext.Chapters
                        .Where(x => x.Id == chapter.Id)
                        .ExecuteUpdateAsync(s => s.SetProperty(p => p.Order, p => -p.Order), ct);

                    if (newOrder < oldOrder)
                    {
                        // Geriye çekme: araya girenleri önce negatife çek, sonra +1 yaparak pozitife döndür
                        // Bu iki aşamalı işlem PostgreSQL'in satır bazlı unique kontrolünü bypass eder.
                        var affectedQuery = dbContext.Chapters
                            .IgnoreQueryFilters()
                            .Where(x => x.BookId == chapter.BookId && x.Id != chapter.Id && x.Order >= newOrder && x.Order < oldOrder);

                        await affectedQuery.ExecuteUpdateAsync(s => s.SetProperty(p => p.Order, p => -p.Order), ct);
                        await dbContext.Chapters
                            .IgnoreQueryFilters()
                            .Where(x => x.BookId == chapter.BookId && x.Order < 0 && x.Id != chapter.Id)
                            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Order, p => Math.Abs(p.Order) + 1), ct);
                    }
                    else
                    {
                        // İleriye atma: araya girenleri önce negatife çek, sonra -1 yaparak pozitife döndür
                        var affectedQuery = dbContext.Chapters
                            .IgnoreQueryFilters()
                            .Where(x => x.BookId == chapter.BookId && x.Id != chapter.Id && x.Order <= newOrder && x.Order > oldOrder);

                        await affectedQuery.ExecuteUpdateAsync(s => s.SetProperty(p => p.Order, p => -p.Order), ct);
                        await dbContext.Chapters
                            .IgnoreQueryFilters()
                            .Where(x => x.BookId == chapter.BookId && x.Order < 0 && x.Id != chapter.Id)
                            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Order, p => Math.Abs(p.Order) - 1), ct);
                    }
                    
                    // Geçerli bölümü yeni sırasına set et
                    chapter.Order = newOrder;
                }

                await dbContext.SaveChangesAsync(ct);
                
                // Eğer bölüm ilk kez yayınlanıyorsa event at
                if (isFirstTimePublished)
                {
                    dbContext.EnqueueOutboxMessage(new ChapterPublishedEvent(
                        chapter.BookId,
                        chapter.Book.Title,
                        chapter.Id,
                        chapter.Title,
                        chapter.Slug,
                        chapter.UserId,
                        chapter.PublishedAt ?? DateTime.UtcNow));
                }

                // Cache Invalidation (Technical Decision 1 Fix)
                await cacheStore.EvictByTagAsync("ChapterCache", ct);
                await chapterCache.RemoveChapterAsync(chapter.Slug);
                
                await transaction.CommitAsync(ct);
                return Result<Response>.Success(new Response { Message = "Bölüm içeriği başarıyla güncellendi." });
            }
            catch (Microsoft.EntityFrameworkCore.DbUpdateException dbEx)
            {
                await transaction.RollbackAsync(ct);
                // 🛑 SUPER DIAGNOSTIC LOG (Expose Everything to User for now)
                string dbError = dbEx.InnerException?.Message ?? dbEx.Message;
                string message = $"!!! GÜNCELLEME HATASI: {dbError} | Data: {dbEx.InnerException?.Data}";

                return Result<Response>.Failure(message);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        });

        if (!updateResult.IsSuccess)
        {
            await Send.ResponseAsync(updateResult, 400, ct);
            return;
        }

        await Send.ResponseAsync(updateResult, 200, ct);
    }
}

