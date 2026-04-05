using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.OutputCaching;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books.Endpoints.ReorderChapters;

[AuditLog("Bölümler Toplu Yeniden Sıralandı")]
public class Endpoint(BooksDbContext dbContext, IOutputCacheStore cacheStore) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books/{BookId}/chapters/reorder");
        Policies(Epiknovel.Shared.Core.Constants.PolicyNames.AuthorContentAccess);
        Summary(s => {
            s.Summary = "Bir kitabın bölümlerini toplu olarak yeniden sıralar.";
            s.Description = "Gönderilen ID sırasına göre tüm bölümlerin Order alanını 1'den başlayarak günceller. Unique Key hatalarını önlemek için negate-and-update tekniği kullanılır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Sahiplik ve Ekip Kontrolü (BOLA)
        bool isBookOwner = await dbContext.Books.AnyAsync(x => x.Id == req.BookId && x.AuthorId == req.UserId, ct);
        bool isTeamMember = await dbContext.BookAuthors.AnyAsync(ba => ba.BookId == req.BookId && ba.UserId == req.UserId, ct);

        if (!isBookOwner && !isTeamMember)
        {
            await Send.ForbiddenAsync(ct);
            return;
        }

        if (req.ChapterIds.Count == 0)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bölüm listesi boş olamaz."), 400, ct);
            return;
        }

        // 🚀 TRANSACTIONAL INTEGRITY
        var strategy = dbContext.Database.CreateExecutionStrategy();
        var updateResult = await strategy.ExecuteAsync(async () => {
            using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
            try {
                // FARKLI BİR YOL: 
                // Önce bu kitaba ait tüm bölümlerin "Order" değerlerini negatife çeviriyoruz. 
                // Böylece 1, 2, 3 gibi pozitif sayılar boşa çıkmış oluyor.
                await dbContext.Chapters
                    .IgnoreQueryFilters()
                    .Where(x => x.BookId == req.BookId && !x.IsDeleted)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Order, p => -Math.Abs(p.Order) - 1000000), ct);

                // Şimdi bellekten çekip yeni sıraları veriyoruz
                var chapters = await dbContext.Chapters
                    .Where(x => x.BookId == req.BookId && !x.IsDeleted)
                    .ToListAsync(ct);

                int orderCounter = 1;
                foreach (var id in req.ChapterIds)
                {
                    var chapter = chapters.FirstOrDefault(x => x.Id == id);
                    if (chapter != null)
                    {
                        chapter.Order = orderCounter++;
                    }
                }
                
                // Eğer listede gönderilmeyen ama DB'de olan bölümler varsa, 
                // onların sırasını da bozmadan (negatif kalmasınlar diye) sona ekleyebiliriz 
                // ama genelde listenin tam gelmesini bekliyoruz. 
                // Kalanlar varsa onların sırasını counter kaldığı yerden devam ettirebiliriz.
                var remaining = chapters.Where(x => x.Order < 0).ToList();
                foreach (var rem in remaining)
                {
                    rem.Order = orderCounter++;
                }

                await dbContext.SaveChangesAsync(ct);
                
                // Cache Invalidation
                await cacheStore.EvictByTagAsync("ChapterCache", ct);
                
                await transaction.CommitAsync(ct);
                return Result<Response>.Success(new Response { Message = "Bölüm sıralaması başarıyla güncellendi." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(ct);
                string message = ex.InnerException?.Message ?? ex.Message;
                return Result<Response>.Failure($"Sıralama güncellenirken hata oluştu: {message}");
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
