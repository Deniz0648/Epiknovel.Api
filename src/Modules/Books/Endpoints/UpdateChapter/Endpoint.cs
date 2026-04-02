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

namespace Epiknovel.Modules.Books.Endpoints.UpdateChapter;

[AuditLog("Bölüm İçeriği Güncellendi (Sync Modu)")]
public class Endpoint(BooksDbContext dbContext, IPermissionService permissionService, IOutputCacheStore cacheStore) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Patch("/books/chapters");
        Policies(PolicyNames.AuthorContentAccess);
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

        // BOLA Hardening: İsteği atan kişi hem bölümün hem de ana kitabın sahibi olmalı
        if (chapter.UserId != req.UserId || chapter.Book.AuthorId != req.UserId)
        {
            await Send.ForbiddenAsync(ct);
            return;
        }

        // 2. Ücretli Yazarlık Yetki Kontrolü
        if (!req.IsFree || req.Price > 0)
        {
            var canPublishPaidChapters = await permissionService.HasPermissionAsync(User, PermissionNames.PublishPaidChapters, ct);
            if (!canPublishPaidChapters)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Bölümü ücretli yapmak için önce başvurup onay almalısınız."), 403, ct);
                return;
            }
        }

        var sanitizer = new Ganss.Xss.HtmlSanitizer();

        // 2. Metadata güncelle
        chapter.Title = req.Title;
        chapter.Order = req.Order;
        chapter.IsFree = req.IsFree;
        chapter.Price = req.Price;
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
            var sanitizedContent = sanitizer.Sanitize(line.Content);

            var existing = existingParagraphs.FirstOrDefault(p => p.Id == line.Id);
            if (existing != null)
            {
                existing.Content = sanitizedContent;
                existing.Type = line.Type;
                existing.Order = currentOrder;
            }
            else
            {
                chapter.Paragraphs.Add(new Paragraph
                {
                    UserId = req.UserId,
                    Content = sanitizedContent,
                    Type = line.Type,
                    Order = currentOrder,
                    Id = line.Id
                });
            }

            if (line.Type == ParagraphType.Text)
            {
                totalWords += sanitizedContent.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
            }
        }

        chapter.WordCount = totalWords;

        try 
        {
            await dbContext.SaveChangesAsync(ct);
            // 🚀 Cache Invalidation: Bölüm güncellendiğinde eski cache'i sil
            await cacheStore.EvictByTagAsync("ChapterCache", ct);
        }
        catch (DbUpdateException)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bölüm sırası çakışması veya veritabanı hatası."), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Bölüm içeriği başarıyla güncellendi ve sanitize edildi."
        }), 200, ct);
    }
}

