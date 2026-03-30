using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Books.Endpoints.DeleteChapter;

[AuditLog("Bölüm Çöpe Taşındı")]
public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Delete("/books/chapters/{Id}");
        Summary(s => {
            s.Summary = "Mevcut bir bölümü çöp kutusuna taşır.";
            s.Description = "Hard delete yapılmaz. Veri korunur. (BOLA Korunmalı).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Bölümü Getir (BOLA: Kendi bölümü mü?)
        var chapter = await dbContext.Chapters
            .FirstOrDefaultAsync(x => x.Id == req.Id && x.UserId == req.UserId, ct);

        if (chapter == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bölüm bulunamadı veya yetkiniz yok."), 404, ct);
            return;
        }

        // 2. Soft Delete (Trash)
        chapter.IsDeleted = true;
        chapter.DeletedAt = DateTime.UtcNow;
        chapter.DeletedByUserId = req.UserId;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Bölüm başarıyla çöp kutusuna taşındı."
        }), 200, ct);
    }
}

