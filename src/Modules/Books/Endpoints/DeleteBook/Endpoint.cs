using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Books.Endpoints.DeleteBook;

[AuditLog("Kitap Çöpe Taşındı")]
public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Delete("/books/{Id}");
        Summary(s => {
            s.Summary = "Mevcut bir kitabı çöp kutusuna taşır.";
            s.Description = "Hard delete yapılmaz. Veri ve bağlı resimler geri yüklenebilir durumda kalır. (BOLA Korunmalı).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Kitabı Getir (BOLA: Yetki Kontrolü)
        var book = await dbContext.Books.FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (book == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        if (book.AuthorId != req.UserId)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bu işlem için yetkiniz yok."), 403, ct);
            return;
        }

        // 2. Soft Delete (Geri Yüklenebilir)
        book.IsDeleted = true;
        book.DeletedAt = DateTime.UtcNow;
        book.DeletedByUserId = req.UserId;

        // NOT: Resimler silinmez, kitap 'Restore' edilebilir.

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Kitap başarıyla çöp kutusuna taşındı."
        }), 200, ct);
    }
}

