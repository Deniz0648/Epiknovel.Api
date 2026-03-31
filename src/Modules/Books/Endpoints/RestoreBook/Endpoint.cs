using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Endpoints.RestoreBook;

public record Request { public Guid Id { get; init; } }

[AuditLog("Kitap Çöp Kutusundan Geri Yüklendi")]
public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/books/{Id}/restore");
        Roles(RoleNames.Admin, RoleNames.SuperAdmin);
        Summary(s => {
            s.Summary = "Silinen bir kitabı çöp kutusundan geri getirir (Yönetici).";
            s.Description = "Kitap ve bağlı tüm bölümleri geri yükler. Sadece Admin ve SuperAdmin yetkisiyle erişilebilir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Kitabı Getir (IgnoreQueryFilters kullanarak silinmiş kitabı bul)
        var book = await dbContext.Books
            .IgnoreQueryFilters()
            .Include(x => x.Chapters)
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (book == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        // 2. Yetki Kontrolü (Admin her şeyi geri yükleyebilir, ancak BOLAValidationPreProcessor zaten rol kontrolü yaptı)
        // Eğer ileride modaratörler sadece kendi sildiklerini geri yükleyebilsin dersek buraya ek kontrol gelir.


        if (!book.IsDeleted)
        {
             await Send.ResponseAsync(Result<string>.Failure("Kitap zaten aktif."), 400, ct);
             return;
        }

        // Kitabı geri yükle
        book.UndoDelete();

        // Eğer kitap toplu silinmişse bölümlerini de geri yüklemek isteyebiliriz.
        // Genelde kitap silindiğinde bölümler de gizlenmiş olur. 
        // Kullanıcı özellikle bölüm sildiyse onları geri yüklememek gerekebilir
        // ama kitap restore ediliyorsa "toplu silinme" durumunda bölümler de gelmeli.
        // Bu örnekte sadece kitabı ve kitabın IsDeleted=true olan bölümlerini (eğer kitapla birlikte silinmişse) açabiliriz.
        // Basitlik adında hepsini geri yüklüyoruz:
        
        foreach (var chapter in book.Chapters.Where(c => c.IsDeleted))
        {
            chapter.UndoDelete();
        }

        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<string>.Success("Kitap ve ilgili bölümleri başarıyla geri yüklendi."), 200, ct);
    }
}
